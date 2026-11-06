alter table public.lectures
  add column speaker_professor_id uuid
    references public.professors (id) on delete set null;

create index lectures_speaker_professor_id_idx
  on public.lectures (speaker_professor_id);

update public.lectures l
   set speaker_professor_id = p.id
  from public.professors p
 where lower(btrim(p.name)) = lower(btrim(l.speaker))
   and (
     select count(*)
       from public.professors o
      where lower(btrim(o.name)) = lower(btrim(l.speaker))
   ) = 1;

drop function public.cadastrar_palestra(
  text, text, uuid, timestamptz, timestamptz, integer, uuid[]
);

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

comment on column public.lectures.speaker_professor_id is
  'Professor escolhido como palestrante. Vazio para convidado externo.';
