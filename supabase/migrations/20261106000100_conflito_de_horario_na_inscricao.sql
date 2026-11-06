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

revoke all on function public.inscrever_em_palestra(uuid) from public, anon;
grant execute on function public.inscrever_em_palestra(uuid) to authenticated;
