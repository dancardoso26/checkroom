create type public.activity_type as enum (
  'class',
  'lecture',
  'exam',
  'defense',
  'event'
);

alter table public.bookings
  add column activity_type public.activity_type not null default 'class';

update public.bookings
   set activity_type = 'lecture'
 where subject_id is null;

comment on column public.bookings.activity_type is
  'O que acontece no espaço. Apenas "class" exige disciplina e vínculo docente.';

create index bookings_activity_type_idx on public.bookings (activity_type);
