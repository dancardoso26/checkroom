-- ---------------------------------------------------------------------------
-- RESTRIÇÕES DE SOBREPOSIÇÃO DE RESERVAS
--
-- A validação da aplicação, em validateBooking, é a que produz mensagem legível
-- para o usuário. Ela não é suficiente sozinha.
--
-- O problema é a janela entre consultar e gravar. Dois professores enviam o
-- formulário para a mesma sala no mesmo horário com poucos milissegundos de
-- diferença. As duas requisições consultam o banco, nenhuma das duas encontra
-- conflito porque nenhuma das duas gravou ainda, e as duas inserem. O resultado
-- é uma sala com duas turmas dentro, sem que nenhum código tenha errado.
--
-- As constraints abaixo fecham essa janela no único lugar onde ela pode ser
-- fechada de verdade: o banco. O PostgreSQL avalia a exclusão dentro da
-- transação do INSERT, então a segunda gravação falha, mesmo simultânea.
--
-- Isso também é o que torna verdadeira a afirmação da monografia de que as
-- regras não dependem exclusivamente da aplicação. Qualquer caminho de escrita,
-- incluindo um INSERT manual pelo painel do Supabase, esbarra nelas.
--
-- COMO LER UMA CONSTRAINT EXCLUDE
--
--   exclude using gist (room_id with =, tstzrange(starts_at, ends_at) with &&)
--
-- Lê-se: recusar a nova linha se existir alguma linha em que, ao mesmo tempo,
-- room_id seja IGUAL (=) ao da nova E o período se SOBREPONHA (&&) ao dela.
-- É uma unique constraint generalizada: em vez de comparar só por igualdade,
-- compara por qualquer operador, o que permite raciocinar sobre intervalos.
--
-- SOBRE OS LIMITES DO INTERVALO
--
-- tstzrange(a, b) usa por padrão o formato [a, b), inclusivo no início e
-- exclusivo no fim. Isso é exatamente o comportamento desejado: uma aula que
-- termina às 12h e outra que começa às 12h se tocam mas não se sobrepõem, e o
-- operador && devolve falso para elas. Trocar para '[]' faria o sistema recusar
-- aulas consecutivas, que é o caso mais comum de uma grade horária.
-- ---------------------------------------------------------------------------

-- btree_gist foi instalada no schema extensions, seguindo a convenção do
-- Supabase. Garantir os dois schemas no search_path evita que a criação falhe
-- por não encontrar a classe de operadores de uuid para o índice GiST.
set search_path = public, extensions;


-- Um espaço não pode receber duas reservas ao mesmo tempo. É o conflito mais
-- óbvio, e o único que existiria se a reserva fosse apenas espaço mais horário.
alter table public.bookings
  add constraint bookings_no_room_overlap
  exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at) with &&
  );

-- Um professor não pode estar em dois lugares ao mesmo tempo. Este conflito não
-- envolve o espaço: as salas podem ser diferentes e ainda assim a reserva é
-- impossível.
alter table public.bookings
  add constraint bookings_no_professor_overlap
  exclude using gist (
    professor_id with =,
    tstzrange(starts_at, ends_at) with &&
  );

-- Uma turma não pode ter duas aulas simultâneas, pela mesma razão. Esta é a
-- verificação que a revisão do professor acrescentou ao escopo, e é o que
-- diferencia a regra de uma agenda genérica de salas: o CheckRoom conhece o
-- contexto acadêmico da reserva.
alter table public.bookings
  add constraint bookings_no_class_overlap
  exclude using gist (
    class_id with =,
    tstzrange(starts_at, ends_at) with &&
  );


-- ---------------------------------------------------------------------------
-- OS NOMES DAS CONSTRAINTS SÃO PARTE DA INTERFACE
--
-- Quando uma delas é violada, o PostgreSQL devolve o erro de código 23P01
-- (exclusion_violation) com o nome da constraint na mensagem. A Server Action
-- lê esse nome para saber qual dos três conflitos ocorreu e exibir a mensagem
-- correta, em vez de um "erro ao salvar" genérico.
--
-- Renomear qualquer uma delas exige atualizar o mapeamento correspondente em
-- src/lib/repositories/bookingRepository.ts.
-- ---------------------------------------------------------------------------
