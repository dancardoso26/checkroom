grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant all privileges on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

grant usage on schema public to authenticated;

create type public.user_role as enum (
  'student',
  'professor',
  'it_support',
  'admin'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'professor',
  full_name text not null,
  user_master boolean not null default false,

  professor_id uuid unique references public.professors (id) on delete set null,
  course_id uuid references public.courses (id) on delete restrict,
  class_id uuid references public.classes (id) on delete restrict,

  terms_accepted_at timestamptz,
  terms_version text,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),

  constraint profiles_master_e_admin check (not user_master or role = 'admin'),
  constraint profiles_curso_so_de_aluno check (course_id is null or role = 'student'),
  constraint profiles_turma_so_de_aluno check (class_id is null or role = 'student')
);

create index profiles_role_idx on public.profiles (role);
create index profiles_course_id_idx on public.profiles (course_id);
create index profiles_class_id_idx on public.profiles (class_id);

create unique index profiles_master_unico
  on public.profiles ((true))
  where user_master;

alter table public.profiles enable row level security;

grant select, update on public.profiles to authenticated;

create policy "perfil proprio ou admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.eh_admin());

create policy "edita o proprio perfil" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.papel_atual()
returns public.user_role
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select role from public.profiles where id = auth.uid() and anonymized_at is null;
$$;

grant execute on function public.papel_atual() to authenticated;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.eh_master()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    (select user_master from public.profiles
      where id = auth.uid() and anonymized_at is null),
    false
  );
$$;

revoke all on function public.eh_master() from public, anon;
grant execute on function public.eh_master() to authenticated;

create or replace function public.eh_aluno()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'student'
  );
$$;

create or replace function public.professor_atual()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select professor_id from public.profiles where id = auth.uid();
$$;

create or replace function public.turma_atual()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select class_id from public.profiles where id = auth.uid();
$$;

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

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
    raise exception 'Apenas a administração altera o vínculo de professor.';
  end if;

  if (new.course_id is distinct from old.course_id or new.class_id is distinct from old.class_id)
     and not (v_anonimizando and new.course_id is null and new.class_id is null)
     and not public.eh_admin() and auth.uid() is not null then
    raise exception 'Apenas a administração altera o curso e a turma do aluno.';
  end if;

  return new;
end;
$$;

create trigger profiles_protege_papel
  before update on public.profiles
  for each row
  execute function public.impedir_troca_de_papel();

create or replace function public.alinhar_curso_com_turma()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.class_id is not null then
    select course_id into new.course_id
      from public.classes
     where id = new.class_id;
  end if;

  return new;
end;
$$;

create trigger profiles_alinha_curso
  before insert or update on public.profiles
  for each row execute function public.alinhar_curso_com_turma();

create or replace function public.alterar_papel(
  p_alvo uuid,
  p_papel public.user_role,
  p_turma uuid default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_atual public.user_role;
  v_turma_atual uuid;
  v_curso_atual uuid;
  v_master boolean;
  v_turma uuid := case when p_papel = 'student' then p_turma else null end;
  v_curso uuid;
begin
  if not public.eh_admin() then
    raise exception 'Apenas a administração altera o papel de um usuário.';
  end if;

  select role, class_id, course_id, user_master
    into v_atual, v_turma_atual, v_curso_atual, v_master
    from public.profiles
   where id = p_alvo and anonymized_at is null;

  if v_atual is null then
    raise exception 'Usuário não encontrado.';
  end if;

  if v_master then
    raise exception 'O administrador master não pode mudar de papel.';
  end if;

  if p_papel = 'student' then
    select course_id into v_curso from public.classes where id = v_turma;

    if v_curso is null then
      raise exception 'Informe a turma do aluno.';
    end if;
  end if;

  if v_atual = p_papel and v_turma_atual is not distinct from v_turma then
    return;
  end if;

  update public.profiles
     set role = p_papel,
         professor_id = case when p_papel = 'professor' then professor_id else null end,
         class_id = v_turma,
         course_id = v_curso
   where id = p_alvo;

  insert into public.audit_logs (actor_id, action, entity, entity_id, before_state, after_state)
  values (
    auth.uid(),
    'user_role_changed',
    'profiles',
    p_alvo,
    jsonb_build_object('role', v_atual, 'course_id', v_curso_atual, 'class_id', v_turma_atual),
    jsonb_build_object('role', p_papel, 'course_id', v_curso, 'class_id', v_turma, 'alvo', p_alvo)
  );
end;
$$;

revoke all on function public.alterar_papel(uuid, public.user_role, uuid) from public, anon;
grant execute on function public.alterar_papel(uuid, public.user_role, uuid) to authenticated;

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

  if v_professor is not null then
    update public.professors
       set name = 'Professor removido',
           email = 'removido-' || v_professor || '@checkroom.invalid'
     where id = v_professor;

    update public.audit_logs
       set before_state = before_state - 'name',
           after_state = case
             when after_state ->> 'name' = 'Professor removido' then after_state
             else after_state - 'name'
           end
     where entity = 'professors' and entity_id = v_professor;
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

grant execute on function public.anonimizar_conta() to authenticated;

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

create or replace function public.liberar_pendencias_da_conta()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  delete from public.lecture_enrollments e
   using public.lectures l
   where e.lecture_id = l.id
     and e.profile_id = new.id
     and l.starts_at > now();

  update public.tickets
     set status = 'cancelled',
         cancelled_at = now()
   where requested_by = new.id
     and status = 'open';

  return new;
end;
$$;

create trigger profiles_libera_pendencias
  after update of anonymized_at on public.profiles
  for each row
  when (old.anonymized_at is null and new.anonymized_at is not null)
  execute function public.liberar_pendencias_da_conta();
