-- As disciplinas de cada curso. "Banco de Dados II" pertence a Sistemas de
-- Informação, e não existe solta.
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

  -- A mesma atribuição cadastrada duas vezes seria erro de digitação.
  constraint teaching_assignments_unique
    unique (professor_id, subject_id, class_id, term)
);

-- A consulta da regra é "existe vínculo para este professor, esta disciplina,
-- esta turma e este período". Sem índice, seria uma varredura a cada reserva.
create index teaching_assignments_lookup_idx
  on public.teaching_assignments (subject_id, class_id, term);

alter table public.bookings
  add column subject_id uuid references public.subjects (id) on delete restrict;

comment on column public.bookings.subject_id is
  'Disciplina da atividade. Nulo em atividades que não são aula, como defesa de TCC ou seminário.';

create index bookings_subject_id_idx on public.bookings (subject_id);

alter table public.subjects              enable row level security;
alter table public.teaching_assignments  enable row level security;
