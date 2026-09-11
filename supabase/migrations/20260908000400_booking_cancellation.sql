create type public.booking_status as enum ('active', 'cancelled');

alter table public.bookings
  add column status public.booking_status not null default 'active';

-- Quem cancelou e por quê. Nulos enquanto a reserva está ativa, e é o check
-- abaixo que impede uma reserva cancelada sem data de cancelamento.
alter table public.bookings
  add column cancelled_at timestamptz,
  add column cancellation_reason text;

alter table public.bookings
  add constraint bookings_cancellation_consistent
  check (
    (status = 'active'    and cancelled_at is null) or
    (status = 'cancelled' and cancelled_at is not null)
  );

create index bookings_status_idx on public.bookings (status);

set search_path = public, extensions;

-- As três constraints são recriadas com "where (status = 'active')". Sem isso a
-- linha cancelada continuaria bloqueando o horário que o cancelamento liberou.
alter table public.bookings drop constraint bookings_no_room_overlap;
alter table public.bookings drop constraint bookings_no_professor_overlap;
alter table public.bookings drop constraint bookings_no_class_overlap;

alter table public.bookings
  add constraint bookings_no_room_overlap
  exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'active');

alter table public.bookings
  add constraint bookings_no_professor_overlap
  exclude using gist (
    professor_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'active');

alter table public.bookings
  add constraint bookings_no_class_overlap
  exclude using gist (
    class_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'active');

create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_reason text default null
)
returns text
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_status public.booking_status;
  v_ends_at timestamptz;
begin
  select status, ends_at into v_status, v_ends_at
    from public.bookings
   where id = p_booking_id
   for update;

  if not found then
    return 'not_found';
  end if;

  if v_status = 'cancelled' then
    return 'already_cancelled';
  end if;

  if v_ends_at <= now() then
    return 'already_finished';
  end if;

  update public.bookings
     set status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = nullif(trim(coalesce(p_reason, '')), '')
   where id = p_booking_id;

  return 'cancelled';
end;
$$;
