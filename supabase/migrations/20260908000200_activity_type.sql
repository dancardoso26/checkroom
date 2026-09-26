create type public.activity_type as enum (
  'class',      -- aula regular de uma disciplina
  'lecture',    -- palestra ou seminário
  'exam',       -- prova ou avaliação
  'defense',    -- defesa de TCC ou qualificação
  'event'       -- evento institucional
);

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
