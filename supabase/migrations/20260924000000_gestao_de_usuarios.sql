-- Gestão de usuários pela administração. Excluir é anonimizar: bookings.created_by
-- aponta para o profile com on delete restrict, e apagar levaria o histórico junto.

-- O corpo comum às duas formas de remoção. Sem grant: só as funções abaixo o
-- chamam, cada uma com a sua verificação de quem pode.
create or replace function public.anonimizar_perfil(p_alvo uuid, p_ator uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- A administração nunca é removida, nem por outra conta nem por ela mesma:
  -- sem ela, ninguém mais gerenciaria usuários nem veria a auditoria.
  if exists (select 1 from public.profiles where id = p_alvo and role = 'admin') then
    raise exception 'Contas da administração não podem ser removidas.';
  end if;

  update public.bookings
     set status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = 'Conta removida'
   where status = 'active'
     and starts_at > now()
     and (created_by = p_alvo or professor_id = (
       select professor_id from public.profiles where id = p_alvo
     ));

  update public.profiles
     set full_name = 'Usuário removido',
         professor_id = null,
         anonymized_at = now()
   where id = p_alvo;

  insert into public.audit_logs (actor_id, action, entity, entity_id)
  values (
    p_ator,
    case when p_ator = p_alvo then 'account_anonymized' else 'user_removed' end,
    'profiles',
    p_alvo
  );
end;
$$;

revoke all on function public.anonimizar_perfil(uuid, uuid) from public, anon, authenticated;

-- A exclusão da própria conta, agora pelo corpo comum e com a trava da
-- administração.
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

  perform public.anonimizar_perfil(v_id, v_id);
end;
$$;

create or replace function public.remover_usuario(p_alvo uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.eh_admin() then
    raise exception 'Apenas a administração remove usuários.';
  end if;

  perform public.anonimizar_perfil(p_alvo, auth.uid());
end;
$$;

revoke all on function public.remover_usuario(uuid) from public, anon;
grant execute on function public.remover_usuario(uuid) to authenticated;
