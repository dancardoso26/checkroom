create or replace function public.curso_atual()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select course_id from public.profiles where id = auth.uid();
$$;

drop policy "palestra visivel fora da TI" on public.lectures;

create policy "palestra visivel conforme o papel" on public.lectures
  for select to authenticated
  using (
    public.papel_atual() is distinct from 'it_support'
    and (
      not public.eh_aluno()
      or exists (
        select 1 from public.lecture_courses lc
         where lc.lecture_id = lectures.id
           and lc.course_id = public.curso_atual()
      )
    )
  );
