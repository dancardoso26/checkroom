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
