-- ---------------------------------------------------------------------------
-- CONTEXTO ACADÊMICO DA RESERVA
--
-- Até aqui a reserva amarrava espaço, professor e turma. Isso já a distinguia de
-- uma agenda genérica, mas ainda aceitava uma combinação academicamente
-- impossível: qualquer professor podia reservar para qualquer turma.
--
-- Estas duas tabelas fecham essa lacuna. A disciplina responde "que aula é
-- esta", e a atribuição docente responde "esta professora leciona esta
-- disciplina para esta turma neste período".
--
-- É o que torna o modelo exclusivo de educação, e não transportável para
-- qualquer área: uma agenda de consultórios ou de salas de coworking não tem
-- onde encaixar um vínculo entre docente, disciplina e turma.
-- ---------------------------------------------------------------------------


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


-- ---------------------------------------------------------------------------
-- ATRIBUIÇÃO DOCENTE
--
-- Quem leciona o quê, para qual turma, em qual período. É a tabela que a regra
-- consulta para responder se a combinação do formulário é possível.
--
-- O período é texto no formato "2026.2" em vez de referência a um calendário
-- acadêmico. O calendário é uma entrega seguinte, com datas de início, fim,
-- recesso e feriados; guardar o rótulo agora permite validar o vínculo sem
-- construí-lo, e a coluna passa a apontar para ele quando existir.
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- A DISCIPLINA NA RESERVA
--
-- Aceita nulo de propósito. Nem toda atividade acadêmica é aula: defesa de TCC,
-- seminário e reunião de colegiado ocupam espaço sem pertencer a uma disciplina.
-- Torná-la obrigatória obrigaria a inventar uma disciplina para esses casos.
--
-- Quando ela é informada, a regra passa a exigir o vínculo. Quando não é, a
-- reserva continua sujeita a todas as outras verificações.
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column subject_id uuid references public.subjects (id) on delete restrict;

comment on column public.bookings.subject_id is
  'Disciplina da atividade. Nulo em atividades que não são aula, como defesa de TCC ou seminário.';

create index bookings_subject_id_idx on public.bookings (subject_id);


alter table public.subjects              enable row level security;
alter table public.teaching_assignments  enable row level security;
