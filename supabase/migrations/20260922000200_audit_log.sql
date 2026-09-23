create table public.audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),

  -- set null, e não restrict: auditoria registra, não impede. O ator é nulo
  -- quando a operação vem do servidor sem sessão, como no seed.
  actor_id uuid references public.profiles (id) on delete set null,

  action text not null,
  entity text not null,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb
);

comment on table public.audit_logs is
  'Trilha de auditoria. Alimentada por trigger para mudanças em dados e pela aplicação para eventos de autenticação.';

create index audit_logs_occurred_at_idx on public.audit_logs (occurred_at desc);
create index audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);

alter table public.audit_logs enable row level security;

-- security definer porque a política de audit_logs não concede insert a
-- ninguém: o único caminho de escrita é esta função.
create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_entity_id uuid;
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
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  return null;
end;
$$;

-- after, para registrar apenas o que o banco confirmou: uma reserva recusada
-- por constraint de sobreposição não vira evento de auditoria.
create trigger bookings_audit
  after insert or update or delete on public.bookings
  for each row
  execute function public.log_audit_event();
