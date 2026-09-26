    -- A administração troca o papel de outro usuário. Pela função, e não por uma
    -- política de update: a regra depende do papel atual e do novo, juntos.
    create or replace function public.alterar_papel(p_alvo uuid, p_papel public.user_role)
    returns void
    language plpgsql
    security definer
    set search_path = pg_catalog, public
    as $$
    declare
      v_atual public.user_role;
    begin
      if not public.eh_admin() then
        raise exception 'Apenas a administração altera o papel de um usuário.';
      end if;

      select role into v_atual from public.profiles where id = p_alvo and anonymized_at is null;

      if v_atual is null then
        raise exception 'Usuário não encontrado.';
      end if;

      -- O administrador é único: nem ele perde o papel por aqui, nem outro o ganha.
      -- A troca de administrador é feita à parte, rebaixando antes de promover.
      if v_atual = 'admin' or p_papel = 'admin' then
        raise exception 'O papel de administrador não é alterado por esta tela.';
      end if;

      if v_atual = p_papel then
        return;
      end if;

      -- Só professor tem vínculo docente. Mantê-lo em outro papel deixaria a conta
      -- reservando em nome do docente, porque a regra olha o vínculo.
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

    revoke all on function public.alterar_papel(uuid, public.user_role) from public, anon;
    grant execute on function public.alterar_papel(uuid, public.user_role) to authenticated;
