-- Os cursos existem como tabela própria, e não como texto em classes, para que
-- corrigir uma grafia não exija varrer a base.
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

-- student_count fica na turma, e não na reserva, porque é atributo dela: se tem
-- 40 alunos, tem 40 em qualquer reserva. É o valor comparado com a capacidade.
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  course_id uuid not null references public.courses (id) on delete restrict,

  -- O check impede que um zero acidental faça a turma caber em qualquer espaço.
  student_count integer not null check (student_count > 0),
  created_at timestamptz not null default now(),

  constraint classes_name_unique unique (course_id, name)
);

create index classes_course_id_idx on public.classes (course_id);

create type public.room_type as enum (
  'classroom',
  'laboratory',
  'auditorium'
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  building text not null,
  capacity integer not null check (capacity > 0),
  room_type public.room_type not null,
  created_at timestamptz not null default now(),

  -- "101" existe no bloco A e no bloco B, e são espaços diferentes.
  constraint rooms_name_unique unique (building, name)
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

-- A chave primária já atende "recursos deste espaço". Este índice atende a
-- pergunta inversa, "espaços com este recurso".
create index room_resources_resource_id_idx
  on public.room_resources (resource_id);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete restrict,
  professor_id uuid not null references public.professors (id) on delete restrict,
  class_id uuid not null references public.classes (id) on delete restrict,

  purpose text not null check (length(trim(purpose)) > 0),

  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),

  constraint bookings_period_valid check (ends_at > starts_at)
);

create index bookings_starts_at_idx on public.bookings (starts_at desc);

create table public.booking_resources (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete restrict,

  primary key (booking_id, resource_id)
);

create index booking_resources_resource_id_idx
  on public.booking_resources (resource_id);
