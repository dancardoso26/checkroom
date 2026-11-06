grant insert, update, delete on
  public.courses, public.subjects, public.classes, public.teaching_assignments
  to authenticated;

grant insert (name, email), update (name, email) on public.professors to authenticated;
grant delete on public.professors to authenticated;

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array['courses', 'subjects', 'classes', 'professors', 'teaching_assignments']
  loop
    execute format(
      'create policy "admin cadastra" on public.%I for insert to authenticated with check (public.eh_admin())',
      v_tabela
    );
    execute format(
      'create policy "admin altera" on public.%I for update to authenticated using (public.eh_admin()) with check (public.eh_admin())',
      v_tabela
    );
    execute format(
      'create policy "admin exclui" on public.%I for delete to authenticated using (public.eh_admin())',
      v_tabela
    );
  end loop;
end;
$$;

create trigger courses_audit
  after insert or update or delete on public.courses
  for each row execute function public.log_audit_event();

create trigger subjects_audit
  after insert or update or delete on public.subjects
  for each row execute function public.log_audit_event();

create trigger classes_audit
  after insert or update or delete on public.classes
  for each row execute function public.log_audit_event();

create trigger professors_audit
  after insert or update or delete on public.professors
  for each row execute function public.log_audit_event('email');

create trigger teaching_assignments_audit
  after insert or update or delete on public.teaching_assignments
  for each row execute function public.log_audit_event();

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
       set name = 'Docente removido',
           email = 'removido-' || v_professor || '@checkroom.invalid'
     where id = v_professor;

    update public.audit_logs
       set before_state = before_state - 'name',
           after_state = case
             when after_state ->> 'name' = 'Docente removido' then after_state
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
