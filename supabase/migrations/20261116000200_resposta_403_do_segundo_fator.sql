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
