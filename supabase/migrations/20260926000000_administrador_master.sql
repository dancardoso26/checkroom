-- Vários administradores, com um master: o dono do sistema, que não pode ser
-- removido, desativado nem rebaixado. Sem ele, ninguém mais gerenciaria o resto.

drop index if exists public.profiles_administrador_unico;

alter table public.profiles
  add column user_master boolean not null default false,
  add constraint profiles_master_e_admin check (not user_master or role = 'admin');

create unique index profiles_master_unico
  on public.profiles ((true))
  where user_master;

comment on column public.profiles.user_master is
  'O administrador dono do sistema. Único, e só alterável pelo service role.';

-- A trigger recusa trocar papel sem sessão de admin; aqui quem roda é o dono
-- do banco, então ela fica desligada só durante estes dois ajustes.
alter table public.profiles disable trigger profiles_protege_papel;

update public.profiles p
   set user_master = true
  from auth.users u
 where u.id = p.id
   and u.email = 'dev.admin@exemplo.edu.br';

update public.profiles p
   set role = 'admin'
  from auth.users u
 where u.id = p.id
   and u.email = 'coordenacao@exemplo.edu.br';

alter table public.profiles enable trigger profiles_protege_papel;

create or replace function public.impedir_troca_de_papel()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Sessão de usuário nunca mexe no master; só o service role (seed, scripts),
  -- que não tem auth.uid(), transfere o posto.
  if new.user_master is distinct from old.user_master and auth.uid() is not null then
    raise exception 'O administrador master só é alterado pelo dono do banco.';
  end if;

  if old.user_master and new.role is distinct from old.role then
    raise exception 'O administrador master não pode mudar de papel.';
  end if;

  if new.role is distinct from old.role and not public.eh_admin() and auth.uid() is not null then
    raise exception 'Apenas a administração altera o papel de um usuário.';
  end if;

  if new.professor_id is distinct from old.professor_id and not public.eh_admin() and auth.uid() is not null then
    raise exception 'Apenas a administração altera o vínculo docente.';
  end if;

  return new;
end;
$$;

-- Esquecer de verdade: além do perfil, o docente vinculado e os e-mails que a
-- trilha de auditoria guardou. As linhas da auditoria ficam, sem o dado pessoal.
create or replace function public.anonimizar_perfil(p_alvo uuid, p_ator uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_professor uuid;
  v_email text;
begin
  if exists (select 1 from public.profiles where id = p_alvo and user_master) then
    raise exception 'O administrador master não pode ser removido.';
  end if;

  select professor_id into v_professor from public.profiles where id = p_alvo;
  select lower(email) into v_email from auth.users where id = p_alvo;

  update public.bookings
     set status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = 'Conta removida'
   where status = 'active'
     and starts_at > now()
     and (created_by = p_alvo or professor_id = v_professor);

  update public.profiles
     set full_name = 'Usuário removido',
         professor_id = null,
         anonymized_at = now()
   where id = p_alvo;

  -- O e-mail do docente é único e obrigatório: vira um endereço inválido e
  -- exclusivo, que o envio de e-mail do sistema também recusa.
  if v_professor is not null then
    update public.professors
       set name = 'Docente removido',
           email = 'removido-' || v_professor || '@checkroom.invalid'
     where id = v_professor;
  end if;

  if v_email is not null then
    update public.audit_logs
       set after_state = after_state - 'email'
     where lower(after_state ->> 'email') = v_email;

    update public.audit_logs
       set before_state = before_state - 'email'
     where lower(before_state ->> 'email') = v_email;
  end if;

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

create or replace function public.alterar_papel(p_alvo uuid, p_papel public.user_role)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_atual public.user_role;
  v_master boolean;
begin
  if not public.eh_admin() then
    raise exception 'Apenas a administração altera o papel de um usuário.';
  end if;

  select role, user_master into v_atual, v_master
    from public.profiles
   where id = p_alvo and anonymized_at is null;

  if v_atual is null then
    raise exception 'Usuário não encontrado.';
  end if;

  if v_master then
    raise exception 'O administrador master não pode mudar de papel.';
  end if;

  if v_atual = p_papel then
    return;
  end if;

  -- Só professor tem vínculo docente: em outro papel, a conta reservaria em
  -- nome do docente, porque a regra olha o vínculo.
  update public.profiles
     set role = p_papel,
         professor_id = case when p_papel = 'professor' then professor_id else null end
   where id = p_alvo;

  insert into public.audit_logs (actor_id, action, entity, entity_id, before_state, after_state)
  values (
    auth.uid(),
    'user_role_changed',
    'profiles',
    p_alvo,
    jsonb_build_object('role', v_atual),
    jsonb_build_object('role', p_papel, 'alvo', p_alvo)
  );
end;
$$;
