truncate table
  public.booking_resources,
  public.bookings,
  public.teaching_assignments,
  public.subjects,
  public.room_resources,
  public.classes,
  public.rooms,
  public.resources,
  public.professors,
  public.courses
  cascade;

create or replace function public.seed_slot(dias integer, hora time)
returns timestamptz
language sql
stable
as $$
  select (
    -- O cast para date é necessário: "date + time" existe no PostgreSQL,
    -- "timestamp + time" não.
    (date_trunc('week', current_date)::date + (7 + dias))
    + hora
  ) at time zone 'America/Sao_Paulo';
$$;

insert into public.courses (name, department) values
  ('Sistemas de Informação', 'Ciências Exatas'),
  ('Engenharia Civil',       'Ciências Exatas'),
  ('Enfermagem',             'Ciências da Saúde');

insert into public.professors (name, email) values
  ('Ana Beatriz Moura',   'ana.moura@umc.br'),
  ('Carlos Eduardo Lima', 'carlos.lima@umc.br'),
  ('Marina Alves Prado',  'marina.prado@umc.br');

insert into public.resources (name) values
  ('Projetor'),
  ('Lousa digital'),
  ('Computadores'),
  ('Ar-condicionado'),
  ('Sistema de som');

-- A turma de 55 alunos não cabe em nenhum espaço além do auditório, e é o que
-- produz o teste de capacidade.
insert into public.classes (name, course_id, student_count) values
  ('SI 8º semestre A', (select id from public.courses where name = 'Sistemas de Informação'), 42),
  ('SI 4º semestre B', (select id from public.courses where name = 'Sistemas de Informação'), 55),
  ('ENG 2º semestre A', (select id from public.courses where name = 'Engenharia Civil'),      38),
  ('ENF 6º semestre A', (select id from public.courses where name = 'Enfermagem'),            30);

-- As disciplinas, e quem leciona cada uma para cada turma. É o vínculo que
-- impede uma professora de Enfermagem reservar em nome da turma de Engenharia.
insert into public.subjects (name, course_id) values
  ('Banco de Dados II',      (select id from public.courses where name = 'Sistemas de Informação')),
  ('Engenharia de Software', (select id from public.courses where name = 'Sistemas de Informação')),
  ('Resistência dos Materiais', (select id from public.courses where name = 'Engenharia Civil')),
  ('Saúde Coletiva',         (select id from public.courses where name = 'Enfermagem'));

insert into public.teaching_assignments (professor_id, subject_id, class_id, term)
select p.id, s.id, c.id, v.term
from (values
  ('ana.moura@umc.br',    'Engenharia de Software',     'SI 8º semestre A',  '2026.2'),
  ('ana.moura@umc.br',    'Banco de Dados II',          'SI 8º semestre A',  '2026.2'),
  ('carlos.lima@umc.br',  'Banco de Dados II',          'SI 4º semestre B',  '2026.2'),
  ('carlos.lima@umc.br',  'Resistência dos Materiais',  'ENG 2º semestre A', '2026.2'),
  ('marina.prado@umc.br', 'Saúde Coletiva',             'ENF 6º semestre A', '2026.2')
) as v (email, subject_name, class_name, term)
join public.professors p on p.email = v.email
join public.subjects s   on s.name = v.subject_name
join public.classes c    on c.name = v.class_name;

-- A sala 102 é pequena e mal equipada de propósito: é ela que faz as
-- verificações de capacidade e de recurso falharem quando precisam falhar.
insert into public.rooms (name, building, capacity, room_type) values
  ('101',       'Bloco A', 45,  'classroom'),
  ('102',       'Bloco A', 30,  'classroom'),
  ('Lab 01',    'Bloco B', 40,  'laboratory'),
  ('Auditório', 'Bloco C', 120, 'auditorium');

-- A sala 102 não tem projetor, único dado necessário para demonstrar a recusa
-- por recurso ausente.
insert into public.room_resources (room_id, resource_id)
select r.id, res.id
from public.rooms r
join (values
  ('Bloco A', '101',       'Projetor'),
  ('Bloco A', '101',       'Ar-condicionado'),
  ('Bloco A', '102',       'Lousa digital'),
  ('Bloco B', 'Lab 01',    'Projetor'),
  ('Bloco B', 'Lab 01',    'Computadores'),
  ('Bloco B', 'Lab 01',    'Ar-condicionado'),
  ('Bloco C', 'Auditório', 'Projetor'),
  ('Bloco C', 'Auditório', 'Sistema de som'),
  ('Bloco C', 'Auditório', 'Ar-condicionado')
) as v (building, room_name, resource_name)
  on v.building = r.building and v.room_name = r.name
join public.resources res on res.name = v.resource_name;

-- As três reservas contra as quais os conflitos são testados, no período
-- noturno, quando a disputa por espaço realmente acontece.
insert into public.bookings (
  room_id, professor_id, class_id, subject_id, activity_type,
  purpose, starts_at, ends_at
)
values
  -- Base dos três testes de conflito: espaço, professora e turma.
  (
    (select id from public.rooms where building = 'Bloco A' and name = '101'),
    (select id from public.professors where email = 'ana.moura@umc.br'),
    (select id from public.classes where name = 'SI 8º semestre A'),
    (select id from public.subjects where name = 'Engenharia de Software'),
    'class',
    'Aula de Engenharia de Software',
    public.seed_slot(0, '19:00'),
    public.seed_slot(0, '20:40')
  ),
  -- Prova o contrário: reservas simultâneas são permitidas quando não
  -- compartilham nenhum dos três vínculos.
  (
    (select id from public.rooms where building = 'Bloco B' and name = 'Lab 01'),
    (select id from public.professors where email = 'carlos.lima@umc.br'),
    (select id from public.classes where name = 'ENG 2º semestre A'),
    (select id from public.subjects where name = 'Resistência dos Materiais'),
    'class',
    'Laboratório de Materiais',
    public.seed_slot(0, '19:00'),
    public.seed_slot(0, '20:40')
  ),
  -- Terça, 20:00 às 21:40, auditório.
  (
    (select id from public.rooms where building = 'Bloco C' and name = 'Auditório'),
    (select id from public.professors where email = 'marina.prado@umc.br'),
    (select id from public.classes where name = 'ENF 6º semestre A'),
    -- Palestra não pertence a disciplina nenhuma, e é o caso que prova que a
    -- reserva sem vínculo continua possível.
    null,
    'lecture',
    'Seminário de Saúde Coletiva',
    public.seed_slot(1, '20:00'),
    public.seed_slot(1, '21:40')
  );

-- O que cada reserva exige.
insert into public.booking_resources (booking_id, resource_id)
select b.id, res.id
from public.bookings b
join (values
  ('Aula de Engenharia de Software', 'Projetor'),
  ('Laboratório de Materiais',       'Computadores'),
  ('Seminário de Saúde Coletiva',    'Projetor'),
  ('Seminário de Saúde Coletiva',    'Sistema de som')
) as v (purpose, resource_name)
  on v.purpose = b.purpose
join public.resources res on res.name = v.resource_name;

drop function public.seed_slot(integer, time);
