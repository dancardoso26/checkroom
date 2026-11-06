create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_entity_id uuid;
  v_omitir text[] := coalesce(tg_argv, array[]::text[]);
begin
  if tg_op = 'DELETE' then
    v_entity_id := old.id;
  else
    v_entity_id := new.id;
  end if;

  insert into public.audit_logs (
    actor_id, action, entity, entity_id, before_state, after_state
  )
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    v_entity_id,
    case when tg_op = 'INSERT' then null else to_jsonb(old) - v_omitir end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) - v_omitir end
  );

  return null;
end;
$$;

grant insert, update, delete on
  public.rooms, public.resources, public.room_resources
  to authenticated;

create policy "admin cadastra espacos" on public.rooms
  for insert to authenticated with check (public.eh_admin());
create policy "admin altera espacos" on public.rooms
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "admin exclui espacos" on public.rooms
  for delete to authenticated using (public.eh_admin());

create policy "admin cadastra recursos" on public.resources
  for insert to authenticated with check (public.eh_admin());
create policy "admin altera recursos" on public.resources
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "admin exclui recursos" on public.resources
  for delete to authenticated using (public.eh_admin());

create policy "admin equipa espacos" on public.room_resources
  for insert to authenticated with check (public.eh_admin());
create policy "admin retira recursos" on public.room_resources
  for delete to authenticated using (public.eh_admin());

create trigger rooms_audit
  after insert or update or delete on public.rooms
  for each row execute function public.log_audit_event();

create trigger resources_audit
  after insert or update or delete on public.resources
  for each row execute function public.log_audit_event();

create or replace function public.salvar_espaco(
  p_id uuid,
  p_nome text,
  p_bloco text,
  p_capacidade integer,
  p_tipo public.room_type,
  p_recursos uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid := p_id;
  v_antes uuid[];
  v_depois uuid[] := array(
    select distinct unnest(coalesce(p_recursos, array[]::uuid[])) order by 1
  );
begin
  if not public.eh_admin() then
    raise exception 'Apenas a administração cadastra espaços.';
  end if;

  if v_id is null then
    insert into public.rooms (name, building, capacity, room_type)
    values (trim(p_nome), trim(p_bloco), p_capacidade, p_tipo)
    returning id into v_id;

    v_antes := array[]::uuid[];
  else
    update public.rooms
       set name = trim(p_nome),
           building = trim(p_bloco),
           capacity = p_capacidade,
           room_type = p_tipo
     where id = v_id;

    if not found then
      raise exception 'Espaço não encontrado.';
    end if;

    v_antes := array(
      select resource_id from public.room_resources where room_id = v_id order by 1
    );
  end if;

  delete from public.room_resources
   where room_id = v_id and not (resource_id = any (v_depois));

  insert into public.room_resources (room_id, resource_id)
  select v_id, unnest(v_depois)
  on conflict do nothing;

  if v_antes is distinct from v_depois and p_id is not null then
    insert into public.audit_logs (actor_id, action, entity, entity_id, before_state, after_state)
    values (
      auth.uid(),
      'room_resources_changed',
      'rooms',
      v_id,
      jsonb_build_object('resource_ids', to_jsonb(v_antes)),
      jsonb_build_object('resource_ids', to_jsonb(v_depois))
    );
  end if;

  return v_id;
end;
$$;

revoke all on function public.salvar_espaco(uuid, text, text, integer, public.room_type, uuid[]) from public, anon;
grant execute on function public.salvar_espaco(uuid, text, text, integer, public.room_type, uuid[]) to authenticated;
