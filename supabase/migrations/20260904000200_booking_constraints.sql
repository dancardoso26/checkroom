-- ---------------------------------------------------------------------------
-- RESTRIÇÕES DE SOBREPOSIÇÃO
--
-- validateBooking produz a mensagem legível, mas não basta sozinha. Entre
-- consultar e gravar existe uma janela: dois professores enviam o formulário
-- para a mesma sala com milissegundos de diferença, nenhum dos dois encontra
-- conflito porque nenhum gravou ainda, e os dois inserem. Uma sala com duas
-- turmas dentro, sem que nenhum código tenha errado.
--
-- As constraints abaixo fecham essa janela no único lugar onde ela pode ser
-- fechada: dentro da transação do INSERT. É também o que torna verdadeira a
-- afirmação da monografia de que as regras não dependem só da aplicação, já que
-- até um INSERT manual pelo painel esbarra nelas.
--
-- COMO LER
--
--   exclude using gist (room_id with =, tstzrange(starts_at, ends_at) with &&)
--
-- Recusar a nova linha se existir alguma em que room_id seja IGUAL ao dela E o
-- período se SOBREPONHA. É uma unique constraint generalizada: compara por
-- qualquer operador, não só por igualdade.
--
-- tstzrange(a, b) usa [a, b) por padrão, inclusivo no início e exclusivo no fim.
-- É o comportamento desejado: uma aula que termina às 12h e outra que começa às
-- 12h se tocam sem sobrepor. Com '[]', o sistema recusaria aulas consecutivas,
-- que são o caso normal de uma grade horária.
-- ---------------------------------------------------------------------------

-- btree_gist está no schema extensions, então os dois entram no search_path para
-- a classe de operadores de uuid ser encontrada.
set search_path = public, extensions;


-- O conflito mais óbvio, e o único que existiria se a reserva fosse apenas
-- espaço mais horário.
alter table public.bookings
  add constraint bookings_no_room_overlap
  exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at) with &&
  );

-- Um professor não pode estar em dois lugares ao mesmo tempo. Não envolve o
-- espaço: as salas podem ser diferentes e a reserva continua impossível.
alter table public.bookings
  add constraint bookings_no_professor_overlap
  exclude using gist (
    professor_id with =,
    tstzrange(starts_at, ends_at) with &&
  );

-- Mesma razão para a turma. Esta é a verificação que a revisão do professor
-- acrescentou, e o que diferencia o CheckRoom de uma agenda genérica de salas.
alter table public.bookings
  add constraint bookings_no_class_overlap
  exclude using gist (
    class_id with =,
    tstzrange(starts_at, ends_at) with &&
  );


-- Os nomes acima são interface: ao violar uma delas o PostgreSQL devolve o erro
-- 23P01 com o nome dentro da mensagem, e bookingRepository.ts o lê para saber
-- qual dos três conflitos ocorreu. Renomear aqui exige atualizar lá.
