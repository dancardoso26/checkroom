create table public.audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),

  actor_id uuid references public.profiles (id) on delete set null,

  action text not null,
  entity text not null,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb
);

create index audit_logs_occurred_at_idx on public.audit_logs (occurred_at desc);
create index audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);

alter table public.audit_logs enable row level security;

grant select on public.audit_logs to authenticated;

create policy "auditoria visivel a admin" on public.audit_logs
  for select to authenticated
  using (public.eh_admin());

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
