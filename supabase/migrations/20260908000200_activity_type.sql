-- ---------------------------------------------------------------------------
-- TIPO DE ATIVIDADE
--
-- Até aqui a disciplina era opcional para acomodar o que não é aula: defesa de
-- TCC, seminário, reunião de colegiado. O efeito colateral era um furo na regra
-- do vínculo docente, que só valia quando o campo estava preenchido. Bastava
-- deixá-lo vazio para contorná-la.
--
-- Declarar o tipo resolve isso. A aula passa a EXIGIR disciplina e vínculo; os
-- demais tipos não têm disciplina a exigir. A regra deixa de depender de o
-- usuário não preencher um campo.
--
-- É também o que o formulário precisa para mostrar apenas os campos que fazem
-- sentido: pedir disciplina em uma defesa de TCC é pedir um dado que não existe.
-- ---------------------------------------------------------------------------

create type public.activity_type as enum (
  'class',      -- aula regular de uma disciplina
  'lecture',    -- palestra ou seminário
  'exam',       -- prova ou avaliação
  'defense',    -- defesa de TCC ou qualificação
  'event'       -- evento institucional
);

-- O default existe para as reservas já gravadas, que são todas aulas ou
-- atividades sem disciplina. Sem ele, a coluna not null não poderia ser
-- acrescentada a uma tabela com linhas.
alter table public.bookings
  add column activity_type public.activity_type not null default 'class';

-- As reservas sem disciplina do seed não são aulas: corrige o default para elas
-- antes que ele se torne uma afirmação falsa no banco.
update public.bookings
   set activity_type = 'lecture'
 where subject_id is null;

comment on column public.bookings.activity_type is
  'O que acontece no espaço. Apenas "class" exige disciplina e vínculo docente.';

create index bookings_activity_type_idx on public.bookings (activity_type);
