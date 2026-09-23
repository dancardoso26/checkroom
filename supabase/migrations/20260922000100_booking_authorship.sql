-- As reservas anteriores à autenticação têm created_by nulo, porque não havia
-- usuário para registrar. São dados de demonstração e o seed as recria.
delete from public.bookings where created_by is null;

-- on delete restrict, e não cascade: o banco passa a recusar a remoção de um
-- profile que registrou reserva, que é o que obriga a exclusão de conta a
-- anonimizar em vez de apagar.
alter table public.bookings
  add constraint bookings_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete restrict;

alter table public.bookings
  alter column created_by set not null;

comment on column public.bookings.created_by is
  'Quem registrou a reserva, que nem sempre é o professor da aula.';

-- Acrescenta o autor a create_booking. O drop remove a assinatura anterior para
-- não deixar duas versões sobrecarregadas.
drop function if exists public.create_booking(
  uuid, uuid, uuid, text, timestamptz, timestamptz, uuid[], public.activity_type, uuid
);

create or replace function public.create_booking(
  p_room_id uuid,
  p_professor_id uuid,
  p_class_id uuid,
  p_purpose text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_resource_ids uuid[],
  p_created_by uuid,
  p_activity_type public.activity_type default 'class',
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
    room_id, professor_id, class_id, subject_id, activity_type,
    purpose, starts_at, ends_at, created_by
  )
  values (
    p_room_id, p_professor_id, p_class_id, p_subject_id, p_activity_type,
    p_purpose, p_starts_at, p_ends_at, p_created_by
  )
  returning id into v_booking_id;

  insert into public.booking_resources (booking_id, resource_id)
  select v_booking_id, resource_id
  from unnest(coalesce(p_resource_ids, array[]::uuid[])) as resource_id
  on conflict (booking_id, resource_id) do nothing;

  return v_booking_id;
end;
$$;
