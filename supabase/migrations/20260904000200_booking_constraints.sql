-- btree_gist está no schema extensions, então os dois entram no search_path para
-- a classe de operadores de uuid ser encontrada.
set search_path = public, extensions;

-- tstzrange é semiaberto: quem termina 20:40 e quem começa 20:40 não se
-- sobrepõem, então aulas em sequência continuam possíveis.
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
