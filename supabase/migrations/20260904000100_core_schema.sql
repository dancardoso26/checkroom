-- ---------------------------------------------------------------------------
-- ESQUEMA BASE DO CHECKROOM
--
-- Oito tabelas que sustentam a criação de reserva com conflito triplo (espaço,
-- professor e turma) e compatibilidade (capacidade e recursos).
--
-- Duas decisões valem para o arquivo inteiro:
--
--   uuid, e não sequência numérica. O Supabase Auth identifica usuários por
--   uuid, e professors passa a se ligar a auth.users em 28/09. Id sequencial
--   exposto em URL também revela volume e permite adivinhar vizinhos.
--
--   timestamptz, e não timestamp. Guarda o instante absoluto e converte na
--   leitura, o que evita o horário mudar de sentido conforme o servidor. A
--   conversão para São Paulo acontece na interface.
-- ---------------------------------------------------------------------------


-- Os cursos existem como tabela própria, e não como texto em classes, para que
-- corrigir uma grafia não exija varrer a base.
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text not null,
  created_at timestamptz not null default now(),

  constraint courses_name_unique unique (name, department)
);


-- Tabela independente nesta etapa. Em 28/09 o id passa a referenciar
-- auth.users, funcionando como o "profiles" típico do Supabase: por isso já
-- nasce com uuid e e-mail único, evitando reescrever as reservas gravadas.
create table public.professors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- A unicidade vem de um índice sobre lower(email), e não de uma constraint na
-- coluna, que trataria "Ana.Moura@umc.br" e "ana.moura@umc.br" como pessoas
-- diferentes. citext resolveria de forma mais direta, mas exigiria outra
-- extensão para ganhar pouco.
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


-- Enum, e não texto com check, porque o Supabase o traduz em união de literais
-- no TypeScript: o tipo gerado vira "classroom" | "laboratory" | "auditorium" em
-- vez de string, e o compilador acusa um valor inválido antes de o código rodar.
--
-- É o que torna verdadeira a seção 2.3 da monografia: com texto solto, a
-- derivação de tipos existiria no papel sem produzir garantia nenhuma.
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


-- Recursos normalizados em tabela, e não em coluna de array, por dois motivos: o
-- DER é avaliado em 05/10 e um array esconderia o relacionamento muitos-para-
-- muitos; e "quais espaços têm projetor" vira um join indexado em vez de uma
-- varredura em texto que quebra ao primeiro erro de grafia.
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),

  constraint resources_name_unique unique (name)
);


-- O que cada espaço OFERECE. Tabela de ligação pura: a chave composta já impede
-- o mesmo recurso duas vezes no mesmo espaço. Cascade nos dois lados porque a
-- linha só descreve um vínculo, sem histórico a preservar.
create table public.room_resources (
  room_id uuid not null references public.rooms (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,

  primary key (room_id, resource_id)
);

-- A chave primária já atende "recursos deste espaço". Este índice atende a
-- pergunta inversa, "espaços com este recurso".
create index room_resources_resource_id_idx
  on public.room_resources (resource_id);


-- Tabela central da regra. Os três vínculos são o que a verificação de conflito
-- triplo examina.
--
-- on delete restrict, e não cascade: apagar um professor não deve fazer sumir o
-- histórico de reservas dele. O banco recusa e obriga a decisão a ser explícita.
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete restrict,
  professor_id uuid not null references public.professors (id) on delete restrict,
  class_id uuid not null references public.classes (id) on delete restrict,

  purpose text not null check (length(trim(purpose)) > 0),

  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),

  -- Sem este check, uma reserva invertida produziria um tstzrange vazio, e
  -- intervalo vazio não se sobrepõe a nada: ela escaparia de TODAS as constraints
  -- de exclusão e ficaria invisível à detecção de conflito.
  constraint bookings_period_valid check (ends_at > starts_at)
);

create index bookings_starts_at_idx on public.bookings (starts_at desc);


-- O que a atividade EXIGE, contraparte de room_resources. A regra de
-- compatibilidade é a diferença entre as duas.
--
-- Os on delete divergem: cascade em booking_id, porque apagada a reserva a
-- exigência some; restrict em resource_id, porque remover "projetor" do catálogo
-- apagaria em silêncio uma condição já validada.
create table public.booking_resources (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete restrict,

  primary key (booking_id, resource_id)
);

create index booking_resources_resource_id_idx
  on public.booking_resources (resource_id);
