create extension if not exists btree_gist with schema extensions;

create type public.activity_type as enum (
  'class',
  'lecture',
  'exam',
  'defense',
  'event'
);

create type public.booking_status as enum ('active', 'cancelled');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete restrict,
  professor_id uuid not null references public.professors (id) on delete restrict,
  class_id uuid not null references public.classes (id) on delete restrict,
  subject_id uuid references public.subjects (id) on delete restrict,
  activity_type public.activity_type not null default 'class',

  purpose text not null check (length(trim(purpose)) > 0),

  starts_at timestamptz not null,
  ends_at timestamptz not null,

  status public.booking_status not null default 'active',
  cancelled_at timestamptz,
  cancellation_reason text,

  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint bookings_period_valid check (ends_at > starts_at),

  constraint bookings_cancellation_consistent check (
    (status = 'active'    and cancelled_at is null) or
    (status = 'cancelled' and cancelled_at is not null)
  ),

  constraint bookings_no_room_overlap
    exclude using gist (
      room_id with =,
      tstzrange(starts_at, ends_at) with &&
    ) where (status = 'active'),

  constraint bookings_no_professor_overlap
    exclude using gist (
      professor_id with =,
      tstzrange(starts_at, ends_at) with &&
    ) where (status = 'active'),

  constraint bookings_no_class_overlap
    exclude using gist (
      class_id with =,
      tstzrange(starts_at, ends_at) with &&
    ) where (status = 'active')
);

create index bookings_starts_at_idx on public.bookings (starts_at desc);
create index bookings_created_by_idx on public.bookings (created_by);
create index bookings_subject_id_idx on public.bookings (subject_id);
create index bookings_activity_type_idx on public.bookings (activity_type);
create index bookings_status_idx on public.bookings (status);

create table public.booking_resources (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete restrict,

  primary key (booking_id, resource_id)
);

create index booking_resources_resource_id_idx
  on public.booking_resources (resource_id);

alter table public.bookings           enable row level security;
alter table public.booking_resources  enable row level security;

grant select, insert, update, delete on
  public.bookings, public.booking_resources to authenticated;

create policy "agenda visivel conforme o papel" on public.bookings
  for select to authenticated
  using (
    public.papel_atual() is distinct from 'it_support'
    and (not public.eh_aluno() or class_id = public.turma_atual())
  );

create policy "cria a propria reserva" on public.bookings
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (public.eh_admin() or professor_id = public.professor_atual())
  );

create policy "altera a propria reserva" on public.bookings
  for update to authenticated
  using (
    public.eh_admin()
    or created_by = auth.uid()
    or professor_id = public.professor_atual()
  )
  with check (
    public.eh_admin()
    or created_by = auth.uid()
    or professor_id = public.professor_atual()
  );

create policy "exclui a propria reserva" on public.bookings
  for delete to authenticated
  using (
    public.eh_admin()
    or created_by = auth.uid()
    or professor_id = public.professor_atual()
  );

create policy "recursos seguem a reserva" on public.booking_resources
  for select to authenticated using (true);

create policy "recursos seguem a reserva na escrita" on public.booking_resources
  for insert to authenticated
  with check (
    exists (
      select 1 from public.bookings b
       where b.id = booking_id
         and (
           public.eh_admin()
           or b.created_by = auth.uid()
           or b.professor_id = public.professor_atual()
         )
    )
  );

create policy "recursos seguem a reserva na remocao" on public.booking_resources
  for delete to authenticated
  using (
    exists (
      select 1 from public.bookings b
       where b.id = booking_id
         and (
           public.eh_admin()
           or b.created_by = auth.uid()
           or b.professor_id = public.professor_atual()
         )
    )
  );

create or replace function public.travar_espaco(p_room_id uuid)
returns void
language sql
set search_path = pg_catalog
as $$
  select pg_advisory_xact_lock(hashtextextended('espaco:' || p_room_id::text, 0));
$$;

revoke all on function public.travar_espaco(uuid) from public, anon;
grant execute on function public.travar_espaco(uuid) to authenticated;

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
  perform public.travar_espaco(p_room_id);

  if exists (
    select 1 from public.lectures
     where room_id = p_room_id
       and tstzrange(starts_at, ends_at) && tstzrange(p_starts_at, p_ends_at)
  ) then
    raise exception using errcode = '23P01', message = 'booking_lecture_overlap';
  end if;

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

grant execute on function public.create_booking(
  uuid, uuid, uuid, text, timestamptz, timestamptz, uuid[], uuid,
  public.activity_type, uuid
) to authenticated;

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

grant execute on function public.cancel_booking(uuid, text) to authenticated;

create trigger bookings_audit
  after insert or update or delete on public.bookings
  for each row execute function public.log_audit_event();
