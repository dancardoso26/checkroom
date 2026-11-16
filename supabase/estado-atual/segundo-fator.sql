create or replace function public.exigir_segundo_fator()
returns void
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
begin
  if v_claims ->> 'role' = 'authenticated'
     and coalesce(v_claims ->> 'aal', '') <> 'aal2' then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'aal2_required',
        'message', 'Conclua a verificacao em duas etapas para acessar os dados.'
      )::text,
      detail = json_build_object(
        'status', 403,
        'headers', json_build_object()
      )::text;
  end if;
end;
$$;

comment on function public.exigir_segundo_fator() is
  'Roda antes de toda chamada a API de dados e recusa sessao autenticada sem segundo fator (aal2).';

alter role authenticator set pgrst.db_pre_request = 'public.exigir_segundo_fator';

notify pgrst, 'reload config';

create policy "exige segundo fator" on public.academic_terms as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "exige segundo fator" on public.audit_logs as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "exige segundo fator" on public.booking_resources as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "exige segundo fator" on public.bookings as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "exige segundo fator" on public.calendar_blocks as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "exige segundo fator" on public.classes as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "exige segundo fator" on public.courses as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "exige segundo fator" on public.lecture_courses as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "exige segundo fator" on public.lecture_enrollments as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "exige segundo fator" on public.lectures as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "exige segundo fator" on public.professors as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "exige segundo fator" on public.profiles as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "exige segundo fator" on public.resources as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "exige segundo fator" on public.room_resources as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "exige segundo fator" on public.rooms as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "exige segundo fator" on public.subjects as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "exige segundo fator" on public.teaching_assignments as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "exige segundo fator" on public.tickets as restrictive
  for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');
