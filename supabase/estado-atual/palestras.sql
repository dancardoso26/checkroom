create table public.lectures (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  speaker text not null check (length(trim(speaker)) > 0),
  speaker_professor_id uuid references public.professors (id) on delete set null,
  room_id uuid not null references public.rooms (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  seats integer not null check (seats > 0),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint lectures_period_valid check (ends_at > starts_at),

  constraint lectures_no_room_overlap
    exclude using gist (room_id with =, tstzrange(starts_at, ends_at) with &&)
);

create index lectures_starts_at_idx on public.lectures (starts_at);
create index lectures_speaker_professor_id_idx on public.lectures (speaker_professor_id);

create table public.lecture_courses (
  lecture_id uuid not null references public.lectures (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete restrict,

  primary key (lecture_id, course_id)
);

create index lecture_courses_course_id_idx on public.lecture_courses (course_id);

create table public.lecture_enrollments (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  enrolled_at timestamptz not null default now(),

  constraint lecture_enrollments_unique unique (lecture_id, profile_id)
);

create index lecture_enrollments_profile_id_idx on public.lecture_enrollments (profile_id);

alter table public.lectures enable row level security;
alter table public.lecture_courses enable row level security;
alter table public.lecture_enrollments enable row level security;

grant select, delete on public.lectures to authenticated;
grant select on public.lecture_courses, public.lecture_enrollments to authenticated;

create policy "palestra visivel fora da TI" on public.lectures
  for select to authenticated
  using (public.papel_atual() is distinct from 'it_support');

create policy "admin exclui palestra" on public.lectures
  for delete to authenticated using (public.eh_admin());

create policy "cursos da palestra visiveis" on public.lecture_courses
  for select to authenticated using (true);

create policy "inscricao propria ou admin" on public.lecture_enrollments
  for select to authenticated
  using (profile_id = auth.uid() or public.eh_admin());

create or replace function public.inscritos_por_palestra(p_palestras uuid[])
returns table (lecture_id uuid, inscritos integer)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select e.lecture_id, count(*)::integer
    from public.lecture_enrollments e
   where e.lecture_id = any (p_palestras)
   group by e.lecture_id;
$$;

revoke all on function public.inscritos_por_palestra(uuid[]) from public, anon;
grant execute on function public.inscritos_por_palestra(uuid[]) to authenticated;

create function public.cadastrar_palestra(
  p_titulo text,
  p_palestrante text,
  p_room_id uuid,
  p_inicio timestamptz,
  p_fim timestamptz,
  p_vagas integer,
  p_cursos uuid[],
  p_palestrante_professor_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
  v_capacidade integer;
begin
  if not public.eh_admin() then
    raise exception 'Apenas a administração cadastra palestras.';
  end if;

  if coalesce(cardinality(p_cursos), 0) = 0 then
    raise exception using errcode = '23514', message = 'lecture_course_required';
  end if;

  select capacity into v_capacidade from public.rooms where id = p_room_id;

  if v_capacidade is null then
    raise exception using errcode = '23503', message = 'lecture_room_not_found';
  end if;

  if p_vagas > v_capacidade then
    raise exception using errcode = '23514', message = 'lecture_seats_exceed_capacity';
  end if;

  perform public.travar_espaco(p_room_id);

  if exists (
    select 1 from public.bookings
     where room_id = p_room_id
       and status = 'active'
       and tstzrange(starts_at, ends_at) && tstzrange(p_inicio, p_fim)
  ) then
    raise exception using errcode = '23P01', message = 'lecture_booking_overlap';
  end if;

  insert into public.lectures (
    title, speaker, speaker_professor_id, room_id, starts_at, ends_at, seats, created_by
  )
  values (
    trim(p_titulo), trim(p_palestrante), p_palestrante_professor_id,
    p_room_id, p_inicio, p_fim, p_vagas, auth.uid()
  )
  returning id into v_id;

  insert into public.lecture_courses (lecture_id, course_id)
  select v_id, c from (select distinct unnest(p_cursos) as c) cursos;

  return v_id;
end;
$$;

revoke all on function public.cadastrar_palestra(
  text, text, uuid, timestamptz, timestamptz, integer, uuid[], uuid
) from public, anon;

grant execute on function public.cadastrar_palestra(
  text, text, uuid, timestamptz, timestamptz, integer, uuid[], uuid
) to authenticated;

create or replace function public.inscrever_em_palestra(p_palestra uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_inicio timestamptz;
  v_fim timestamptz;
  v_vagas integer;
  v_curso uuid;
  v_inscritos integer;
begin
  select course_id into v_curso
    from public.profiles
   where id = auth.uid() and role = 'student' and anonymized_at is null;

  if not found then
    return 'not_student';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  select starts_at, ends_at, seats into v_inicio, v_fim, v_vagas
    from public.lectures where id = p_palestra for update;

  if not found then
    return 'not_found';
  end if;

  if v_curso is null or not exists (
    select 1 from public.lecture_courses
     where lecture_id = p_palestra and course_id = v_curso
  ) then
    return 'course_not_allowed';
  end if;

  if v_inicio <= now() then
    return 'started';
  end if;

  if exists (
    select 1 from public.lecture_enrollments
     where lecture_id = p_palestra and profile_id = auth.uid()
  ) then
    return 'already_enrolled';
  end if;

  if exists (
    select 1
      from public.lecture_enrollments e
      join public.lectures l on l.id = e.lecture_id
     where e.profile_id = auth.uid()
       and e.lecture_id <> p_palestra
       and tstzrange(l.starts_at, l.ends_at) && tstzrange(v_inicio, v_fim)
  ) then
    return 'time_conflict';
  end if;

  select count(*) into v_inscritos
    from public.lecture_enrollments where lecture_id = p_palestra;

  if v_inscritos >= v_vagas then
    return 'full';
  end if;

  insert into public.lecture_enrollments (lecture_id, profile_id)
  values (p_palestra, auth.uid());

  return 'enrolled';
end;
$$;

create or replace function public.cancelar_inscricao(p_palestra uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_inicio timestamptz;
begin
  select starts_at into v_inicio from public.lectures where id = p_palestra;

  if not found then
    return 'not_found';
  end if;

  if v_inicio <= now() then
    return 'started';
  end if;

  delete from public.lecture_enrollments
   where lecture_id = p_palestra and profile_id = auth.uid();

  if not found then
    return 'not_enrolled';
  end if;

  return 'cancelled';
end;
$$;

revoke all on function public.inscrever_em_palestra(uuid) from public, anon;
revoke all on function public.cancelar_inscricao(uuid) from public, anon;
grant execute on function public.inscrever_em_palestra(uuid) to authenticated;
grant execute on function public.cancelar_inscricao(uuid) to authenticated;

create trigger lectures_audit
  after insert or update or delete on public.lectures
  for each row execute function public.log_audit_event();

create trigger lecture_enrollments_audit
  after insert or update or delete on public.lecture_enrollments
  for each row execute function public.log_audit_event();
