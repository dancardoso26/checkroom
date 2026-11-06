alter table public.profiles
  add column course_id uuid references public.courses (id) on delete restrict,
  add constraint profiles_curso_so_de_aluno check (course_id is null or role = 'student');

create index profiles_course_id_idx on public.profiles (course_id);

comment on column public.profiles.course_id is
  'Curso do aluno. Nulo para os demais papéis.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, role, full_name, professor_id, course_id)
  values (
    new.id,
    coalesce(
      (new.raw_app_meta_data ->> 'role')::public.user_role,
      'student'
    ),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    (new.raw_app_meta_data ->> 'professor_id')::uuid,
    (new.raw_app_meta_data ->> 'course_id')::uuid
  );

  return new;
end;
$$;

create or replace function public.impedir_troca_de_papel()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_anonimizando boolean := old.anonymized_at is null and new.anonymized_at is not null;
begin
  if new.user_master is distinct from old.user_master and auth.uid() is not null then
    raise exception 'O administrador master só é alterado pelo dono do banco.';
  end if;

  if old.user_master and new.role is distinct from old.role then
    raise exception 'O administrador master não pode mudar de papel.';
  end if;

  if new.role is distinct from old.role and not public.eh_admin() and auth.uid() is not null then
    raise exception 'Apenas a administração altera o papel de um usuário.';
  end if;

  if new.professor_id is distinct from old.professor_id
     and not (v_anonimizando and new.professor_id is null)
     and not public.eh_admin() and auth.uid() is not null then
    raise exception 'Apenas a administração altera o vínculo docente.';
  end if;

  if new.course_id is distinct from old.course_id
     and not (v_anonimizando and new.course_id is null)
     and not public.eh_admin() and auth.uid() is not null then
    raise exception 'Apenas a administração altera o curso do aluno.';
  end if;

  return new;
end;
$$;

drop function if exists public.alterar_papel(uuid, public.user_role);

create or replace function public.alterar_papel(
  p_alvo uuid,
  p_papel public.user_role,
  p_curso uuid default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_atual public.user_role;
  v_curso_atual uuid;
  v_master boolean;
  v_curso uuid := case when p_papel = 'student' then p_curso else null end;
begin
  if not public.eh_admin() then
    raise exception 'Apenas a administração altera o papel de um usuário.';
  end if;

  select role, course_id, user_master into v_atual, v_curso_atual, v_master
    from public.profiles
   where id = p_alvo and anonymized_at is null;

  if v_atual is null then
    raise exception 'Usuário não encontrado.';
  end if;

  if v_master then
    raise exception 'O administrador master não pode mudar de papel.';
  end if;

  if v_atual = p_papel and v_curso_atual is not distinct from v_curso then
    return;
  end if;

  update public.profiles
     set role = p_papel,
         professor_id = case when p_papel = 'professor' then professor_id else null end,
         course_id = v_curso
   where id = p_alvo;

  insert into public.audit_logs (actor_id, action, entity, entity_id, before_state, after_state)
  values (
    auth.uid(),
    'user_role_changed',
    'profiles',
    p_alvo,
    jsonb_build_object('role', v_atual, 'course_id', v_curso_atual),
    jsonb_build_object('role', p_papel, 'course_id', v_curso, 'alvo', p_alvo)
  );
end;
$$;

revoke all on function public.alterar_papel(uuid, public.user_role, uuid) from public, anon;
grant execute on function public.alterar_papel(uuid, public.user_role, uuid) to authenticated;
