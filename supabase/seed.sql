-- ---------------------------------------------------------------------------
-- DADOS DE EXEMPLO
--
-- Este arquivo NÃO é uma migration. Migrations descrevem a estrutura do banco e
-- valem para produção; este arquivo popula um banco de desenvolvimento com o
-- mínimo necessário para exercitar a regra de negócio e demonstrá-la ao
-- orientador.
--
-- ATENÇÃO: a primeira instrução APAGA todo o conteúdo das oito tabelas. É o que
-- torna o arquivo repetível, permitindo rodá-lo quantas vezes for preciso
-- durante o desenvolvimento sem acumular duplicatas. Não execute em um banco
-- com dados que importem.
--
-- Os dados não são aleatórios: cada registro existe para tornar possível um
-- caso de teste específico, indicado nos comentários. O roteiro de verificação
-- está no final do arquivo.
-- ---------------------------------------------------------------------------

truncate table
  public.booking_resources,
  public.bookings,
  public.room_resources,
  public.classes,
  public.rooms,
  public.resources,
  public.professors,
  public.courses
  cascade;


-- ---------------------------------------------------------------------------
-- Auxiliar de horário
--
-- Os horários das reservas de exemplo são calculados a partir da próxima
-- segunda-feira, e não escritos como datas fixas. Uma data fixa envelhece: em
-- outubro o seed criaria reservas no passado, e a tela de próximas reservas
-- apareceria vazia na demonstração.
--
-- A conversão explícita com "at time zone 'America/Sao_Paulo'" existe porque as
-- colunas são timestamptz. Sem ela, "19:00" seria interpretado no fuso do
-- servidor, que no Supabase é UTC, e as aulas noturnas apareceriam de
-- madrugada.
--
-- A função é removida no fim do arquivo: serve ao seed, não ao sistema.
-- ---------------------------------------------------------------------------
create or replace function public.seed_slot(dias integer, hora time)
returns timestamptz
language sql
stable
as $$
  select (
    -- date_trunc devolve a segunda-feira desta semana; o cast para date é
    -- necessário porque "date + time" existe no PostgreSQL e devolve timestamp,
    -- enquanto "timestamp + time" não é um operador válido.
    (date_trunc('week', current_date)::date + (7 + dias))
    + hora
  ) at time zone 'America/Sao_Paulo';
$$;


-- ---------------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------------

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


-- ---------------------------------------------------------------------------
-- Turmas
--
-- Os tamanhos são escolhidos para produzir o teste de capacidade: a turma de
-- 55 alunos não cabe em nenhum espaço além do auditório.
-- ---------------------------------------------------------------------------
insert into public.classes (name, course_id, student_count) values
  ('SI 8º semestre A', (select id from public.courses where name = 'Sistemas de Informação'), 42),
  ('SI 4º semestre B', (select id from public.courses where name = 'Sistemas de Informação'), 55),
  ('ENG 2º semestre A', (select id from public.courses where name = 'Engenharia Civil'),      38),
  ('ENF 6º semestre A', (select id from public.courses where name = 'Enfermagem'),            30);


-- ---------------------------------------------------------------------------
-- Espaços
--
-- A sala 102 é pequena e mal equipada de propósito: é o espaço que faz as
-- verificações de capacidade e de recurso falharem quando precisam falhar.
-- ---------------------------------------------------------------------------
insert into public.rooms (name, building, capacity, room_type) values
  ('101',       'Bloco A', 45,  'classroom'),
  ('102',       'Bloco A', 30,  'classroom'),
  ('Lab 01',    'Bloco B', 40,  'laboratory'),
  ('Auditório', 'Bloco C', 120, 'auditorium');


-- ---------------------------------------------------------------------------
-- O que cada espaço oferece
--
-- Repare que a sala 102 não tem projetor. Esse é o único dado necessário para
-- demonstrar a recusa por recurso ausente.
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- Reservas já existentes
--
-- São as três reservas contra as quais os conflitos serão testados. Todas na
-- próxima semana, no período noturno, que é quando a disputa por espaço
-- realmente acontece na instituição.
-- ---------------------------------------------------------------------------
insert into public.bookings (room_id, professor_id, class_id, purpose, starts_at, ends_at)
values
  -- Segunda, 19:00 às 20:40, Bloco A 101.
  -- Base dos três testes de conflito: mesmo espaço, mesma professora, mesma turma.
  (
    (select id from public.rooms where building = 'Bloco A' and name = '101'),
    (select id from public.professors where email = 'ana.moura@umc.br'),
    (select id from public.classes where name = 'SI 8º semestre A'),
    'Aula de Engenharia de Software',
    public.seed_slot(0, '19:00'),
    public.seed_slot(0, '20:40')
  ),
  -- Segunda, mesmo horário, mas outro espaço, outro professor e outra turma.
  -- Existe para provar o contrário: reservas simultâneas são permitidas quando
  -- não compartilham nenhum dos três vínculos.
  (
    (select id from public.rooms where building = 'Bloco B' and name = 'Lab 01'),
    (select id from public.professors where email = 'carlos.lima@umc.br'),
    (select id from public.classes where name = 'ENG 2º semestre A'),
    'Laboratório de Materiais',
    public.seed_slot(0, '19:00'),
    public.seed_slot(0, '20:40')
  ),
  -- Terça, 20:00 às 21:40, auditório.
  (
    (select id from public.rooms where building = 'Bloco C' and name = 'Auditório'),
    (select id from public.professors where email = 'marina.prado@umc.br'),
    (select id from public.classes where name = 'ENF 6º semestre A'),
    'Seminário de Saúde Coletiva',
    public.seed_slot(1, '20:00'),
    public.seed_slot(1, '21:40')
  );


-- ---------------------------------------------------------------------------
-- O que cada reserva exige
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- ROTEIRO DE VERIFICAÇÃO
--
-- Com estes dados, cada caso previsto no plano tem um cenário pronto. Os cinco
-- primeiros devem ser RECUSADOS, os dois últimos ACEITOS.
--
--  1. Conflito de espaço
--     Bloco A 101, segunda 19:00-20:40, com outro professor e outra turma.
--
--  2. Conflito de professor
--     Ana Beatriz Moura, segunda 19:30-21:00, em qualquer outro espaço.
--     Nenhum espaço está ocupado, mas a professora está.
--
--  3. Conflito de turma
--     SI 8º semestre A, segunda 19:30-21:00, com outro professor e outro
--     espaço. É o conflito que a revisão do orientador acrescentou.
--
--  4. Capacidade insuficiente
--     SI 4º semestre B (55 alunos) na sala Bloco A 101 (45 lugares).
--
--  5. Recurso ausente
--     Qualquer turma na sala Bloco A 102 exigindo Projetor. A sala tem apenas
--     lousa digital.
--
--  6. Limites que se tocam
--     Bloco A 101, segunda 20:40-22:20, logo após a aula existente. Deve ser
--     ACEITO: o intervalo é fechado no início e aberto no fim, então 20:40 não
--     conta como sobreposição. É o caso que mais falha em implementações
--     ingênuas de comparação de horário.
--
--  7. Reserva válida
--     SI 4º semestre B no Bloco C Auditório, quarta 19:00-20:40, exigindo
--     Projetor. Cabe, tem o recurso, e nada está ocupado.
--
-- Os casos 1, 2, 3 e 6 devem ser verificados DUAS vezes: pelo formulário, onde
-- a resposta vem de validateBooking, e por INSERT direto no editor SQL do
-- Supabase, onde a resposta vem das constraints de exclusão. As duas camadas
-- precisam concordar.
-- ---------------------------------------------------------------------------
