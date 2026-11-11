create type public.ticket_priority as enum ('low', 'medium', 'high');

create type public.ticket_status as enum ('open', 'in_progress', 'resolved', 'cancelled');

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete restrict,

  requested_by uuid not null references public.profiles (id) on delete restrict,
  assigned_to uuid references public.profiles (id) on delete restrict,

  description text not null check (length(trim(description)) between 1 and 2000),
  priority public.ticket_priority not null default 'medium',
  status public.ticket_status not null default 'open',
  resolution_note text,

  created_at timestamptz not null default now(),
  started_at timestamptz,
  resolved_at timestamptz,
  cancelled_at timestamptz,

  constraint tickets_status_consistent check (
    (status = 'open'
      and assigned_to is null and started_at is null
      and resolved_at is null and cancelled_at is null and resolution_note is null)
    or (status = 'in_progress'
      and assigned_to is not null and started_at is not null
      and resolved_at is null and cancelled_at is null and resolution_note is null)
    or (status = 'resolved'
      and assigned_to is not null and started_at is not null
      and resolved_at is not null and cancelled_at is null
      and length(trim(coalesce(resolution_note, ''))) > 0)
    or (status = 'cancelled'
      and assigned_to is null and resolved_at is null
      and cancelled_at is not null and resolution_note is null)
  )
);

create index tickets_status_idx on public.tickets (status);
create index tickets_requested_by_idx on public.tickets (requested_by);
create index tickets_room_id_idx on public.tickets (room_id);
create index tickets_created_at_idx on public.tickets (created_at desc);

alter table public.tickets enable row level security;

grant select, insert on public.tickets to authenticated;

create policy "chamado visivel ao solicitante, ti e admin" on public.tickets
  for select to authenticated
  using (
    requested_by = auth.uid()
    or public.papel_atual() in ('it_support', 'admin')
  );

create policy "professor e admin abrem chamado" on public.tickets
  for insert to authenticated
  with check (
    requested_by = auth.uid()
    and status = 'open'
    and public.papel_atual() in ('professor', 'admin')
  );

create or replace function public.assumir_chamado(p_chamado uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status public.ticket_status;
begin
  if public.papel_atual() is distinct from 'it_support' and not public.eh_master() then
    return 'forbidden';
  end if;

  select status into v_status from public.tickets where id = p_chamado for update;

  if not found then
    return 'not_found';
  end if;

  if v_status <> 'open' then
    return 'invalid_transition';
  end if;

  update public.tickets
     set status = 'in_progress',
         assigned_to = auth.uid(),
         started_at = now()
   where id = p_chamado;

  return 'ok';
end;
$$;

create or replace function public.devolver_chamado(p_chamado uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status public.ticket_status;
  v_responsavel uuid;
begin
  select status, assigned_to into v_status, v_responsavel
    from public.tickets where id = p_chamado for update;

  if not found then
    return 'not_found';
  end if;

  if v_responsavel is distinct from auth.uid() and not public.eh_master() then
    return 'forbidden';
  end if;

  if v_status <> 'in_progress' then
    return 'invalid_transition';
  end if;

  update public.tickets
     set status = 'open',
         assigned_to = null,
         started_at = null
   where id = p_chamado;

  return 'ok';
end;
$$;

create or replace function public.resolver_chamado(p_chamado uuid, p_nota text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status public.ticket_status;
begin
  if public.papel_atual() is distinct from 'it_support' and not public.eh_master() then
    return 'forbidden';
  end if;

  if length(trim(coalesce(p_nota, ''))) = 0 then
    return 'note_required';
  end if;

  select status into v_status from public.tickets where id = p_chamado for update;

  if not found then
    return 'not_found';
  end if;

  if v_status <> 'in_progress' then
    return 'invalid_transition';
  end if;

  update public.tickets
     set status = 'resolved',
         resolved_at = now(),
         resolution_note = trim(p_nota)
   where id = p_chamado;

  return 'ok';
end;
$$;

create or replace function public.cancelar_chamado(p_chamado uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status public.ticket_status;
  v_solicitante uuid;
begin
  select status, requested_by into v_status, v_solicitante
    from public.tickets where id = p_chamado for update;

  if not found then
    return 'not_found';
  end if;

  if v_solicitante <> auth.uid() and not public.eh_master() then
    return 'forbidden';
  end if;

  if v_status <> 'open' then
    return 'invalid_transition';
  end if;

  update public.tickets
     set status = 'cancelled',
         cancelled_at = now()
   where id = p_chamado;

  return 'ok';
end;
$$;

create or replace function public.excluir_chamado(p_chamado uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.eh_master() then
    return 'forbidden';
  end if;

  delete from public.tickets where id = p_chamado;

  if not found then
    return 'not_found';
  end if;

  return 'ok';
end;
$$;

revoke all on function public.assumir_chamado(uuid) from public, anon;
revoke all on function public.devolver_chamado(uuid) from public, anon;
revoke all on function public.resolver_chamado(uuid, text) from public, anon;
revoke all on function public.cancelar_chamado(uuid) from public, anon;
revoke all on function public.excluir_chamado(uuid) from public, anon;

grant execute on function public.assumir_chamado(uuid) to authenticated;
grant execute on function public.devolver_chamado(uuid) to authenticated;
grant execute on function public.resolver_chamado(uuid, text) to authenticated;
grant execute on function public.cancelar_chamado(uuid) to authenticated;
grant execute on function public.excluir_chamado(uuid) to authenticated;

create trigger tickets_audit
  after insert or update or delete on public.tickets
  for each row execute function public.log_audit_event();
