create or replace function public.anonimizar_conta()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid := auth.uid();
begin
  if v_id is null then
    raise exception 'Sem sessão para anonimizar.';
  end if;

  update public.bookings
     set status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = 'Conta removida a pedido do titular'
   where status = 'active'
     and starts_at > now()
     and (created_by = v_id or professor_id = (
       select professor_id from public.profiles where id = v_id
     ));

  update public.profiles
     set full_name = 'Usuário removido',
         professor_id = null,
         anonymized_at = now()
   where id = v_id;

  insert into public.audit_logs (actor_id, action, entity, entity_id)
  values (v_id, 'account_anonymized', 'profiles', v_id);
end;
$$;

grant execute on function public.anonimizar_conta() to authenticated;
