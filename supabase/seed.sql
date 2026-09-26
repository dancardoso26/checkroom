-- profiles entra na lista porque professors cascatearia até ela de qualquer
-- forma. Quem recria as contas é scripts/seed-usuarios.mts, que roda depois.
truncate table
  public.audit_logs,
  public.profiles,
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

insert into public.courses (name, department) values
  ('Sistemas de Informação', 'Ciências Exatas'),
  ('Engenharia Civil',       'Ciências Exatas'),
  ('Enfermagem',             'Ciências da Saúde');

insert into public.professors (name, email) values
  ('Ana Beatriz Moura',   'ana.moura@exemplo.edu.br'),
  ('Carlos Eduardo Lima', 'carlos.lima@exemplo.edu.br'),
  ('Marina Alves Prado',  'marina.prado@exemplo.edu.br');

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
  ('ana.moura@exemplo.edu.br',    'Engenharia de Software',     'SI 8º semestre A',  '2026.2'),
  ('ana.moura@exemplo.edu.br',    'Banco de Dados II',          'SI 8º semestre A',  '2026.2'),
  ('carlos.lima@exemplo.edu.br',  'Banco de Dados II',          'SI 4º semestre B',  '2026.2'),
  ('carlos.lima@exemplo.edu.br',  'Resistência dos Materiais',  'ENG 2º semestre A', '2026.2'),
  ('marina.prado@exemplo.edu.br', 'Saúde Coletiva',             'ENF 6º semestre A', '2026.2')
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
