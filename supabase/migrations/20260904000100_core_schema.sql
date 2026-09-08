-- ---------------------------------------------------------------------------
-- ESQUEMA BASE DO CHECKROOM
--
-- Sete tabelas que sustentam a primeira regra de negócio: a criação de uma
-- reserva com verificação de conflito triplo (espaço, professor e turma) e de
-- compatibilidade (capacidade e recursos).
--
-- DECISÕES QUE VALEM PARA O ARQUIVO INTEIRO
--
-- Identificadores em uuid, e não em sequência numérica, por dois motivos. O
-- primeiro é que o Supabase Auth identifica usuários por uuid, e em 28/09 a
-- tabela professors passa a se ligar a auth.users; começar já em uuid evita
-- migrar tipo de chave primária depois. O segundo é que um id sequencial
-- exposto em URL revela volume de dados e permite adivinhar registros vizinhos.
--
-- Datas em timestamptz, nunca em timestamp. O tipo com fuso guarda o instante
-- absoluto em UTC e converte na leitura. Isso evita que o horário de uma
-- reserva mude de sentido conforme o servidor, e é o que faz os operadores de
-- intervalo usados na detecção de conflito compararem instantes reais. A
-- conversão para o fuso de São Paulo acontece na interface, não no banco.
--
-- Nomes de tabela e coluna em inglês, no plural para tabelas, acompanhando a
-- nomenclatura já adotada no diagrama de arquitetura da monografia.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- COURSES: os cursos da instituição
--
-- Existe como tabela própria, e não como texto dentro de classes, porque o
-- curso é o que agrupa as turmas nos relatórios de ocupação previstos para o
-- painel. Guardar o nome repetido em cada turma tornaria impossível corrigir
-- uma grafia sem varrer a base.
-- ---------------------------------------------------------------------------
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text not null,
  created_at timestamptz not null default now(),

  -- Dois cursos de mesmo nome no mesmo departamento seriam erro de digitação,
  -- não registros distintos.
  constraint courses_name_unique unique (name, department)
);


-- ---------------------------------------------------------------------------
-- PROFESSORS: os docentes que solicitam reservas
--
-- Tabela independente NESTA etapa. Em 28/09, quando a autenticação entrar, o
-- caminho previsto é transformar o id desta tabela em referência a auth.users,
-- passando a funcionar como o "profiles" típico do Supabase.
--
-- Por isso o id já é uuid e o email já é único: são exatamente as duas
-- características que auth.users exige, e mantê-las agora evita reescrever as
-- reservas já gravadas quando a troca acontecer.
-- ---------------------------------------------------------------------------
create table public.professors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- O e-mail é a identidade do professor no sistema, então precisa ser único.
--
-- A unicidade vem de um índice sobre lower(email), e não de uma constraint
-- unique na coluna, porque a constraint compararia diferenciando maiúsculas:
-- "Ana.Moura@umc.br" e "ana.moura@umc.br" passariam como pessoas diferentes.
-- O tipo citext resolveria isso de forma mais direta, mas exigiria mais uma
-- extensão para ganhar pouco. Uma estrutura só, e não as duas, porque duas
-- garantias para a mesma regra só confundem quem lê o modelo.
create unique index professors_email_lower_idx
  on public.professors (lower(email));


-- ---------------------------------------------------------------------------
-- CLASSES: as turmas
--
-- student_count é o dado que a regra de negócio compara com a capacidade do
-- espaço. Fica aqui, e não na reserva, porque é um atributo da turma: se ela
-- tem 40 alunos, tem 40 alunos em qualquer reserva que fizer.
-- ---------------------------------------------------------------------------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  course_id uuid not null references public.courses (id) on delete restrict,

  -- Turma sem aluno não existe. O check impede que um zero acidental faça a
  -- verificação de capacidade passar em qualquer espaço.
  student_count integer not null check (student_count > 0),
  created_at timestamptz not null default now(),

  constraint classes_name_unique unique (course_id, name)
);

-- Acelera a listagem de turmas de um curso, usada no formulário de reserva.
create index classes_course_id_idx on public.classes (course_id);


-- ---------------------------------------------------------------------------
-- ROOM_TYPE: os tipos de espaço
--
-- Um enum, e não uma coluna de texto com check, porque o Supabase traduz enum
-- do PostgreSQL em união de literais no TypeScript. O tipo gerado vira
-- "classroom" | "laboratory" | "auditorium" em vez de string, e o compilador
-- passa a acusar um valor inválido antes de o código rodar.
--
-- Isso importa porque a monografia afirma, na seção 2.3, que os tipos do
-- TypeScript são derivados do esquema do banco. Com texto solto, essa derivação
-- existiria no papel mas não produziria garantia nenhuma.
--
-- O custo do enum é que acrescentar um valor exige alter type. É aceitável: a
-- lista de tipos de espaço de uma instituição muda raramente.
-- ---------------------------------------------------------------------------
create type public.room_type as enum (
  'classroom',
  'laboratory',
  'auditorium'
);


-- ---------------------------------------------------------------------------
-- ROOMS: os espaços reserváveis
-- ---------------------------------------------------------------------------
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  building text not null,
  capacity integer not null check (capacity > 0),
  room_type public.room_type not null,
  created_at timestamptz not null default now(),

  -- O nome de uma sala só é único dentro do prédio: "101" existe no bloco A e
  -- no bloco B, e são espaços diferentes.
  constraint rooms_name_unique unique (building, name)
);


-- ---------------------------------------------------------------------------
-- RESOURCES: o catálogo de recursos
--
-- Projetor, lousa digital, computadores. Normalizado em tabela própria, e não
-- em uma coluna de array de texto, por duas razões.
--
-- A primeira é de modelagem: o DER é avaliado em 05/10, e um array esconde um
-- relacionamento muitos-para-muitos que o modelo deveria mostrar.
--
-- A segunda é prática: com tabela, a pergunta "quais espaços têm projetor" é um
-- join indexado. Com array, é uma varredura em texto que não aproveita índice e
-- quebra ao primeiro erro de grafia.
-- ---------------------------------------------------------------------------
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),

  constraint resources_name_unique unique (name)
);


-- ---------------------------------------------------------------------------
-- ROOM_RESOURCES: o que cada espaço OFERECE
--
-- Tabela de ligação pura, sem id próprio: a chave primária composta já impede
-- que o mesmo recurso seja cadastrado duas vezes no mesmo espaço.
--
-- on delete cascade nos dois lados porque a linha aqui só descreve um vínculo.
-- Removido o espaço ou o recurso, o vínculo perde sentido e não há histórico a
-- preservar, ao contrário do que acontece com bookings.
-- ---------------------------------------------------------------------------
create table public.room_resources (
  room_id uuid not null references public.rooms (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,

  primary key (room_id, resource_id)
);

-- A chave primária já indexa (room_id, resource_id), o que atende à consulta
-- "recursos deste espaço". Este índice atende à consulta inversa, "espaços que
-- possuem este recurso", que o índice da chave primária não cobre.
create index room_resources_resource_id_idx
  on public.room_resources (resource_id);


-- ---------------------------------------------------------------------------
-- BOOKINGS: as reservas
--
-- Tabela central da regra de negócio. Cada linha amarra um espaço, um professor
-- e uma turma a um intervalo de tempo, e são esses três vínculos que a
-- verificação de conflito triplo examina.
--
-- on delete restrict nas três chaves estrangeiras, e não cascade: apagar um
-- professor não deve fazer sumir silenciosamente o histórico de reservas dele.
-- O banco recusa a exclusão e obriga a decisão a ser explícita.
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete restrict,
  professor_id uuid not null references public.professors (id) on delete restrict,
  class_id uuid not null references public.classes (id) on delete restrict,

  -- Finalidade da reserva, em texto livre: "Aula de Banco de Dados II",
  -- "Defesa de TCC". É o que aparece na grade de ocupação.
  purpose text not null check (length(trim(purpose)) > 0),

  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),

  -- Sem isto, uma reserva com fim antes do início seria aceita. Além de não
  -- fazer sentido, ela produziria um tstzrange vazio, e intervalo vazio nunca
  -- se sobrepõe a nada: a reserva invertida passaria por TODAS as constraints
  -- de exclusão da próxima migration e ficaria invisível à detecção de
  -- conflito. Este check é o que impede esse furo.
  constraint bookings_period_valid check (ends_at > starts_at)
);

-- Índice para a listagem cronológica de reservas, que é a consulta mais
-- frequente da tela /reservas.
create index bookings_starts_at_idx on public.bookings (starts_at desc);


-- ---------------------------------------------------------------------------
-- BOOKING_RESOURCES: o que a atividade EXIGE
--
-- Contraparte de room_resources. Uma diz o que o espaço tem, a outra o que a
-- reserva precisa, e a regra de compatibilidade é a diferença entre as duas.
--
-- Aqui os on delete divergem de propósito. Cascade em booking_id, porque
-- apagada a reserva a exigência deixa de existir. Restrict em resource_id,
-- porque remover "projetor" do catálogo enquanto reservas o exigem apagaria
-- silenciosamente uma condição que já foi validada.
-- ---------------------------------------------------------------------------
create table public.booking_resources (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete restrict,

  primary key (booking_id, resource_id)
);

create index booking_resources_resource_id_idx
  on public.booking_resources (resource_id);
