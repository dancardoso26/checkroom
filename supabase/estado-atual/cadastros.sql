create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text not null,
  created_at timestamptz not null default now(),

  constraint courses_name_unique unique (name, department)
);

create table public.professors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create unique index professors_email_lower_idx
  on public.professors (lower(email));

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  course_id uuid not null references public.courses (id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint classes_name_unique unique (course_id, name)
);

create index classes_course_id_idx on public.classes (course_id);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  course_id uuid not null references public.courses (id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint subjects_name_unique unique (course_id, name)
);

create index subjects_course_id_idx on public.subjects (course_id);

create table public.teaching_assignments (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.professors (id) on delete restrict,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  class_id uuid not null references public.classes (id) on delete restrict,
  term text not null,
  created_at timestamptz not null default now(),

  constraint teaching_assignments_unique
    unique (professor_id, subject_id, class_id, term)
);

create index teaching_assignments_lookup_idx
  on public.teaching_assignments (subject_id, class_id, term);

create type public.room_type as enum (
  'classroom',
  'laboratory',
  'auditorium'
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  building_number smallint not null,
  floor text not null,
  room_number smallint not null,

  name text generated always as (
    building_number::text || floor || '-' || lpad(room_number::text, 2, '0')
  ) stored,
  building text generated always as (
    'Prédio ' || building_number::text
  ) stored,

  capacity integer not null check (capacity > 0),
  room_type public.room_type not null,
  created_at timestamptz not null default now(),

  constraint rooms_building_number_check check (building_number between 1 and 99),
  constraint rooms_floor_check check (floor ~ '^(S|T|[1-9])$'),
  constraint rooms_room_number_check check (room_number between 1 and 999),
  constraint rooms_code_unique unique (building_number, floor, room_number)
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),

  constraint resources_name_unique unique (name)
);

create table public.room_resources (
  room_id uuid not null references public.rooms (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,

  primary key (room_id, resource_id)
);

create index room_resources_resource_id_idx
  on public.room_resources (resource_id);

alter table public.courses               enable row level security;
alter table public.professors            enable row level security;
alter table public.classes               enable row level security;
alter table public.subjects              enable row level security;
alter table public.teaching_assignments  enable row level security;
alter table public.rooms                 enable row level security;
alter table public.resources             enable row level security;
alter table public.room_resources        enable row level security;

grant select, insert, update, delete on
  public.courses, public.classes, public.subjects, public.teaching_assignments,
  public.rooms, public.resources, public.room_resources
  to authenticated;

grant select (id, name, created_at) on public.professors to authenticated;
grant insert (name, email), update (name, email) on public.professors to authenticated;
grant delete on public.professors to authenticated;

create policy "catalogo visivel a autenticados" on public.courses
  for select to authenticated using (true);
create policy "admin cadastra" on public.courses
  for insert to authenticated with check (public.eh_admin());
create policy "admin altera" on public.courses
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "admin exclui" on public.courses
  for delete to authenticated using (public.eh_admin());

create policy "catalogo visivel a autenticados" on public.professors
  for select to authenticated using (true);
create policy "admin cadastra" on public.professors
  for insert to authenticated with check (public.eh_admin());
create policy "admin altera" on public.professors
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "admin exclui" on public.professors
  for delete to authenticated using (public.eh_admin());

create policy "catalogo visivel a autenticados" on public.classes
  for select to authenticated using (true);
create policy "admin cadastra" on public.classes
  for insert to authenticated with check (public.eh_admin());
create policy "admin altera" on public.classes
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "admin exclui" on public.classes
  for delete to authenticated using (public.eh_admin());

create policy "catalogo visivel a autenticados" on public.subjects
  for select to authenticated using (true);
create policy "admin cadastra" on public.subjects
  for insert to authenticated with check (public.eh_admin());
create policy "admin altera" on public.subjects
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "admin exclui" on public.subjects
  for delete to authenticated using (public.eh_admin());

create policy "catalogo visivel a autenticados" on public.teaching_assignments
  for select to authenticated using (true);
create policy "admin cadastra" on public.teaching_assignments
  for insert to authenticated with check (public.eh_admin());
create policy "admin altera" on public.teaching_assignments
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "admin exclui" on public.teaching_assignments
  for delete to authenticated using (public.eh_admin());

create policy "catalogo visivel a autenticados" on public.rooms
  for select to authenticated using (true);
create policy "admin cadastra espacos" on public.rooms
  for insert to authenticated with check (public.eh_admin());
create policy "admin altera espacos" on public.rooms
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "admin exclui espacos" on public.rooms
  for delete to authenticated using (public.eh_admin());

create policy "catalogo visivel a autenticados" on public.resources
  for select to authenticated using (true);
create policy "admin cadastra recursos" on public.resources
  for insert to authenticated with check (public.eh_admin());
create policy "admin altera recursos" on public.resources
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "admin exclui recursos" on public.resources
  for delete to authenticated using (public.eh_admin());

create policy "catalogo visivel a autenticados" on public.room_resources
  for select to authenticated using (true);
create policy "admin equipa espacos" on public.room_resources
  for insert to authenticated with check (public.eh_admin());
create policy "admin retira recursos" on public.room_resources
  for delete to authenticated using (public.eh_admin());

create or replace function public.salvar_espaco(
  p_id uuid,
  p_predio smallint,
  p_andar text,
  p_sala smallint,
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
    insert into public.rooms (building_number, floor, room_number, capacity, room_type)
    values (p_predio, upper(p_andar), p_sala, p_capacidade, p_tipo)
    returning id into v_id;

    v_antes := array[]::uuid[];
  else
    update public.rooms
       set building_number = p_predio,
           floor = upper(p_andar),
           room_number = p_sala,
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

revoke all on function public.salvar_espaco(uuid, smallint, text, smallint, integer, public.room_type, uuid[]) from public, anon;
grant execute on function public.salvar_espaco(uuid, smallint, text, smallint, integer, public.room_type, uuid[]) to authenticated;

create trigger courses_audit
  after insert or update or delete on public.courses
  for each row execute function public.log_audit_event();

create trigger professors_audit
  after insert or update or delete on public.professors
  for each row execute function public.log_audit_event('email');

create trigger classes_audit
  after insert or update or delete on public.classes
  for each row execute function public.log_audit_event();

create trigger subjects_audit
  after insert or update or delete on public.subjects
  for each row execute function public.log_audit_event();

create trigger teaching_assignments_audit
  after insert or update or delete on public.teaching_assignments
  for each row execute function public.log_audit_event();

create trigger rooms_audit
  after insert or update or delete on public.rooms
  for each row execute function public.log_audit_event();

create trigger resources_audit
  after insert or update or delete on public.resources
  for each row execute function public.log_audit_event();
