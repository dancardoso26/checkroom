truncate table
  public.calendar_blocks,
  public.academic_terms,
  public.lecture_enrollments,
  public.lecture_courses,
  public.lectures,
  public.tickets,
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
  ('Engenharia Civil', 'Ciências Exatas'),
  ('Enfermagem', 'Ciências da Saúde'),
  ('Psicologia', 'Ciências da Saúde'),
  ('Administração', 'Ciências Sociais Aplicadas'),
  ('Direito', 'Ciências Jurídicas');

insert into public.professors (name, email) values
  ('Ana Beatriz Moura', 'ana.moura@exemplo.edu.br'),
  ('Carlos Eduardo Lima', 'carlos.lima@exemplo.edu.br'),
  ('Marina Alves Prado', 'marina.prado@exemplo.edu.br'),
  ('Roberto Figueiredo', 'roberto.figueiredo@exemplo.edu.br'),
  ('Juliana Castro', 'juliana.castro@exemplo.edu.br'),
  ('Fernando Azevedo', 'fernando.azevedo@exemplo.edu.br'),
  ('Patrícia Nogueira', 'patricia.nogueira@exemplo.edu.br'),
  ('Eduardo Martins', 'eduardo.martins@exemplo.edu.br'),
  ('Camila Ribeiro', 'camila.ribeiro@exemplo.edu.br'),
  ('Lucas Barreto', 'lucas.barreto@exemplo.edu.br'),
  ('Helena Duarte', 'helena.duarte@exemplo.edu.br'),
  ('Ricardo Tavares', 'ricardo.tavares@exemplo.edu.br');

insert into public.resources (name) values
  ('Projetor'),
  ('Lousa digital'),
  ('Computadores'),
  ('Ar-condicionado'),
  ('Sistema de som'),
  ('Microfone sem fio'),
  ('Videoconferência'),
  ('Quadro branco'),
  ('Simuladores de enfermagem');

insert into public.classes (name, course_id)
select v.nome, c.id
from (values
  ('SI 2º semestre A', 'Sistemas de Informação'),
  ('SI 4º semestre B', 'Sistemas de Informação'),
  ('SI 6º semestre A', 'Sistemas de Informação'),
  ('SI 8º semestre A', 'Sistemas de Informação'),
  ('ENG 2º semestre A', 'Engenharia Civil'),
  ('ENG 6º semestre A', 'Engenharia Civil'),
  ('ENG 8º semestre A', 'Engenharia Civil'),
  ('ENF 2º semestre A', 'Enfermagem'),
  ('ENF 6º semestre A', 'Enfermagem'),
  ('PSI 4º semestre A', 'Psicologia'),
  ('PSI 8º semestre A', 'Psicologia'),
  ('ADM 3º semestre A', 'Administração'),
  ('ADM 7º semestre A', 'Administração'),
  ('DIR 5º semestre A', 'Direito'),
  ('DIR 9º semestre A', 'Direito')
) as v (nome, curso)
join public.courses c on c.name = v.curso;

insert into public.subjects (name, course_id)
select v.nome, c.id
from (values
  ('Banco de Dados II', 'Sistemas de Informação'),
  ('Engenharia de Software', 'Sistemas de Informação'),
  ('Algoritmos e Estruturas de Dados', 'Sistemas de Informação'),
  ('Redes de Computadores', 'Sistemas de Informação'),
  ('Inteligência Artificial', 'Sistemas de Informação'),
  ('Programação Web', 'Sistemas de Informação'),
  ('Sistemas Operacionais', 'Sistemas de Informação'),
  ('Gestão de Projetos de TI', 'Sistemas de Informação'),
  ('Resistência dos Materiais', 'Engenharia Civil'),
  ('Cálculo II', 'Engenharia Civil'),
  ('Estruturas de Concreto', 'Engenharia Civil'),
  ('Topografia', 'Engenharia Civil'),
  ('Hidráulica', 'Engenharia Civil'),
  ('Saúde Coletiva', 'Enfermagem'),
  ('Anatomia Humana', 'Enfermagem'),
  ('Fundamentos de Enfermagem', 'Enfermagem'),
  ('Farmacologia', 'Enfermagem'),
  ('Psicologia do Desenvolvimento', 'Psicologia'),
  ('Neurociência do Comportamento', 'Psicologia'),
  ('Psicopatologia', 'Psicologia'),
  ('Contabilidade Geral', 'Administração'),
  ('Marketing Estratégico', 'Administração'),
  ('Gestão de Pessoas', 'Administração'),
  ('Direito Constitucional', 'Direito'),
  ('Direito Civil I', 'Direito'),
  ('Direito Penal', 'Direito')
) as v (nome, curso)
join public.courses c on c.name = v.curso;

insert into public.teaching_assignments (professor_id, subject_id, class_id, term)
select p.id, s.id, c.id, v.term
from (values
  ('Ana Beatriz Moura', 'Engenharia de Software', 'SI 8º semestre A', '2026.2'),
  ('Ana Beatriz Moura', 'Banco de Dados II', 'SI 8º semestre A', '2026.2'),
  ('Carlos Eduardo Lima', 'Resistência dos Materiais', 'ENG 2º semestre A', '2026.2'),
  ('Carlos Eduardo Lima', 'Banco de Dados II', 'SI 4º semestre B', '2026.2'),
  ('Marina Alves Prado', 'Saúde Coletiva', 'ENF 6º semestre A', '2026.2'),
  ('Roberto Figueiredo', 'Algoritmos e Estruturas de Dados', 'SI 2º semestre A', '2026.2'),
  ('Roberto Figueiredo', 'Sistemas Operacionais', 'SI 6º semestre A', '2026.2'),
  ('Roberto Figueiredo', 'Redes de Computadores', 'SI 4º semestre B', '2026.2'),
  ('Juliana Castro', 'Inteligência Artificial', 'SI 8º semestre A', '2026.2'),
  ('Juliana Castro', 'Programação Web', 'SI 6º semestre A', '2026.2'),
  ('Fernando Azevedo', 'Cálculo II', 'ENG 2º semestre A', '2026.2'),
  ('Fernando Azevedo', 'Estruturas de Concreto', 'ENG 6º semestre A', '2026.2'),
  ('Fernando Azevedo', 'Topografia', 'ENG 8º semestre A', '2026.2'),
  ('Patrícia Nogueira', 'Anatomia Humana', 'ENF 2º semestre A', '2026.2'),
  ('Patrícia Nogueira', 'Fundamentos de Enfermagem', 'ENF 6º semestre A', '2026.2'),
  ('Patrícia Nogueira', 'Farmacologia', 'ENF 2º semestre A', '2026.2'),
  ('Eduardo Martins', 'Contabilidade Geral', 'ADM 3º semestre A', '2026.2'),
  ('Eduardo Martins', 'Marketing Estratégico', 'ADM 7º semestre A', '2026.2'),
  ('Eduardo Martins', 'Gestão de Pessoas', 'ADM 3º semestre A', '2026.2'),
  ('Camila Ribeiro', 'Direito Constitucional', 'DIR 5º semestre A', '2026.2'),
  ('Camila Ribeiro', 'Direito Civil I', 'DIR 9º semestre A', '2026.2'),
  ('Lucas Barreto', 'Direito Penal', 'DIR 5º semestre A', '2026.2'),
  ('Helena Duarte', 'Psicologia do Desenvolvimento', 'PSI 4º semestre A', '2026.2'),
  ('Helena Duarte', 'Neurociência do Comportamento', 'PSI 8º semestre A', '2026.2'),
  ('Helena Duarte', 'Psicopatologia', 'PSI 4º semestre A', '2026.2'),
  ('Ricardo Tavares', 'Gestão de Projetos de TI', 'SI 8º semestre A', '2026.2'),
  ('Ricardo Tavares', 'Hidráulica', 'ENG 6º semestre A', '2026.2')
) as v (professor, disciplina, turma, term)
join public.professors p on p.name = v.professor
join public.classes c on c.name = v.turma
join public.subjects s on s.name = v.disciplina and s.course_id = c.course_id;

insert into public.rooms (building_number, floor, room_number, capacity, room_type) values
  (1, 'T', 1, 45, 'classroom'),
  (1, 'T', 2, 30, 'classroom'),
  (1, 'T', 3, 50, 'classroom'),
  (1, 'T', 4, 35, 'classroom'),
  (1, '1', 5, 40, 'classroom'),
  (1, '1', 6, 60, 'classroom'),
  (2, '1', 4, 40, 'laboratory'),
  (2, '1', 5, 40, 'laboratory'),
  (2, 'T', 1, 30, 'laboratory'),
  (2, 'T', 2, 40, 'laboratory'),
  (3, 'T', 10, 70, 'classroom'),
  (3, 'T', 11, 80, 'classroom'),
  (3, 'T', 12, 120, 'auditorium'),
  (4, 'T', 1, 200, 'auditorium'),
  (4, 'S', 2, 40, 'classroom');

insert into public.room_resources (room_id, resource_id)
select r.id, res.id
from public.rooms r
join (values
  ('1T-01', 'Projetor'),
  ('1T-01', 'Ar-condicionado'),
  ('1T-01', 'Quadro branco'),
  ('1T-02', 'Lousa digital'),
  ('1T-02', 'Ar-condicionado'),
  ('1T-03', 'Projetor'),
  ('1T-03', 'Ar-condicionado'),
  ('1T-04', 'Projetor'),
  ('1T-04', 'Quadro branco'),
  ('11-05', 'Projetor'),
  ('11-05', 'Ar-condicionado'),
  ('11-06', 'Projetor'),
  ('11-06', 'Ar-condicionado'),
  ('11-06', 'Sistema de som'),
  ('21-04', 'Projetor'),
  ('21-04', 'Computadores'),
  ('21-04', 'Ar-condicionado'),
  ('21-05', 'Projetor'),
  ('21-05', 'Computadores'),
  ('21-05', 'Ar-condicionado'),
  ('2T-01', 'Simuladores de enfermagem'),
  ('2T-01', 'Projetor'),
  ('2T-01', 'Ar-condicionado'),
  ('2T-02', 'Simuladores de enfermagem'),
  ('2T-02', 'Quadro branco'),
  ('3T-10', 'Projetor'),
  ('3T-10', 'Ar-condicionado'),
  ('3T-11', 'Projetor'),
  ('3T-11', 'Ar-condicionado'),
  ('3T-11', 'Sistema de som'),
  ('3T-12', 'Projetor'),
  ('3T-12', 'Sistema de som'),
  ('3T-12', 'Ar-condicionado'),
  ('3T-12', 'Microfone sem fio'),
  ('3T-12', 'Videoconferência'),
  ('4T-01', 'Projetor'),
  ('4T-01', 'Sistema de som'),
  ('4T-01', 'Ar-condicionado'),
  ('4T-01', 'Microfone sem fio'),
  ('4T-01', 'Videoconferência'),
  ('4S-02', 'Projetor')
) as v (codigo, resource_name)
  on v.codigo = r.name
join public.resources res on res.name = v.resource_name;

insert into public.academic_terms (code, starts_on, ends_on) values
  ('2026.1', '2026-02-02', '2026-06-27'),
  ('2026.2', '2026-08-03', '2026-12-19'),
  ('2027.1', '2027-02-01', '2027-06-26');

insert into public.calendar_blocks (starts_on, ends_on, room_id, reason)
select v.de::date, v.ate::date, r.id, v.motivo
from (values
  ('2026-04-03', '2026-04-03', null::text, 'Sexta-feira Santa'),
  ('2026-04-21', '2026-04-21', null::text, 'Tiradentes'),
  ('2026-05-01', '2026-05-01', null::text, 'Dia do Trabalho'),
  ('2026-06-04', '2026-06-04', null::text, 'Corpus Christi'),
  ('2026-09-07', '2026-09-07', null::text, 'Independência do Brasil'),
  ('2026-09-21', '2026-09-22', '3T-12', 'Dedetização do auditório'),
  ('2026-10-12', '2026-10-12', null::text, 'Nossa Senhora Aparecida'),
  ('2026-10-15', '2026-10-15', null::text, 'Dia do Professor, sem aulas'),
  ('2026-11-02', '2026-11-02', null::text, 'Finados'),
  ('2026-11-16', '2026-11-18', '2T-01', 'Manutenção dos simuladores'),
  ('2026-11-20', '2026-11-20', null::text, 'Consciência Negra'),
  ('2026-12-07', '2026-12-08', '1T-02', 'Troca do piso'),
  ('2026-12-25', '2026-12-25', null::text, 'Natal')
) as v (de, ate, espaco, motivo)
left join public.rooms r on r.name = v.espaco;
