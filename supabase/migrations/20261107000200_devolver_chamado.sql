create or replace function public.devolver_chamado(p_chamado uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status public.ticket_status;
  v_responsavel uuid;
begin
  select status, assigned_to into v_status, v_responsavel
    from public.tickets where id = p_chamado for update;

  if not found then
    return 'not_found';
  end if;

  if v_responsavel is distinct from auth.uid() and not public.eh_master() then
    return 'forbidden';
  end if;

  if v_status <> 'in_progress' then
    return 'invalid_transition';
  end if;

  update public.tickets
     set status = 'open',
         assigned_to = null,
         started_at = null
   where id = p_chamado;

  return 'ok';
end;
$$;

revoke all on function public.devolver_chamado(uuid) from public, anon;
grant execute on function public.devolver_chamado(uuid) to authenticated;
