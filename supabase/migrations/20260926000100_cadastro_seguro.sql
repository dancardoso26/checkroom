-- O papel e o vínculo docente deixam de vir de user_metadata, que o próprio
-- usuário escreve ao se cadastrar: com a chave pública, qualquer um criaria uma
-- conta já como administrador. A conta nasce como aluno, e o servidor grava o
-- papel logo depois de criá-la (convite e seed). app_metadata é lido só por
-- garantia: o Supabase o grava depois do insert, então aqui ele vem vazio.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, role, full_name, professor_id)
  values (
    new.id,
    -- Sem papel definido pelo servidor, a conta nasce com o menor privilégio.
    coalesce(
      (new.raw_app_meta_data ->> 'role')::public.user_role,
      'student'
    ),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    (new.raw_app_meta_data ->> 'professor_id')::uuid
  );

  return new;
end;
$$;

-- O e-mail do docente é dado pessoal e só serve às notificações, que o
-- servidor envia com a chave secreta. Os demais usuários veem só o nome.
revoke select on public.professors from authenticated;
grant select (id, name, created_at) on public.professors to authenticated;
