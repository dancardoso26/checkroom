create or replace function public.excluir_chamado(p_chamado uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.eh_master() then
    return 'forbidden';
  end if;

  delete from public.tickets where id = p_chamado;

  if not found then
    return 'not_found';
  end if;

  return 'ok';
end;
$$;

revoke all on function public.excluir_chamado(uuid) from public, anon;
grant execute on function public.excluir_chamado(uuid) to authenticated;
