drop function if exists public.create_booking(
  uuid, uuid, uuid, text, timestamptz, timestamptz, uuid[]
);

drop function if exists public.create_booking(
  uuid, uuid, uuid, uuid, text, timestamptz, timestamptz, uuid[]
);

create or replace function public.create_booking(
  p_room_id uuid,
  p_professor_id uuid,
  p_class_id uuid,
  p_purpose text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_resource_ids uuid[],
  p_subject_id uuid default null
)
returns uuid
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_booking_id uuid;
begin
  insert into public.bookings (
    room_id, professor_id, class_id, subject_id, purpose, starts_at, ends_at
  )
  values (
    p_room_id, p_professor_id, p_class_id, p_subject_id,
    p_purpose, p_starts_at, p_ends_at
  )
  returning id into v_booking_id;

  insert into public.booking_resources (booking_id, resource_id)
  select v_booking_id, resource_id
  from unnest(coalesce(p_resource_ids, array[]::uuid[])) as resource_id
  on conflict (booking_id, resource_id) do nothing;

  return v_booking_id;
end;
$$;
