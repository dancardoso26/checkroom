alter table public.profiles
  add column class_id uuid references public.classes (id) on delete restrict,
  add constraint profiles_turma_so_de_aluno check (class_id is null or role = 'student');

create index profiles_class_id_idx on public.profiles (class_id);

comment on column public.profiles.class_id is
  'Turma do aluno. Define quais reservas ele enxerga. Nulo para os demais papéis.';

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

  if (new.course_id is distinct from old.course_id or new.class_id is distinct from old.class_id)
     and not (v_anonimizando and new.course_id is null and new.class_id is null)
     and not public.eh_admin() and auth.uid() is not null then
    raise exception 'Apenas a administração altera o curso e a turma do aluno.';
  end if;

  return new;
end;
$$;

drop function if exists public.alterar_papel(uuid, public.user_role, uuid);

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

create or replace function public.turma_atual()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select class_id from public.profiles where id = auth.uid();
$$;

drop policy "agenda visivel a autenticados" on public.bookings;

create policy "agenda visivel conforme o papel" on public.bookings
  for select to authenticated
  using (not public.eh_aluno() or class_id = public.turma_atual());
