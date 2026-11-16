create or replace function public.leciona_na_turma(p_turma uuid, p_quando timestamptz)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
      from public.teaching_assignments ta
      join public.academic_terms t on t.code = ta.term
     where ta.professor_id = public.professor_atual()
       and ta.class_id = p_turma
       and (p_quando at time zone 'America/Sao_Paulo')::date
           between t.starts_on and t.ends_on
  );
$$;

comment on function public.leciona_na_turma(uuid, timestamptz) is
  'Diz se o professor logado tem vinculo com a turma no periodo letivo da data informada.';

revoke execute on function public.leciona_na_turma(uuid, timestamptz) from public, anon;
grant execute on function public.leciona_na_turma(uuid, timestamptz) to authenticated;

alter policy "agenda visivel conforme o papel" on public.bookings
  using (
    case public.papel_atual()
      when 'admin' then true
      when 'student' then class_id = public.turma_atual()
      when 'professor' then
        professor_id = public.professor_atual()
        or created_by = (select auth.uid())
        or public.leciona_na_turma(class_id, starts_at)
      else false
    end
  );
