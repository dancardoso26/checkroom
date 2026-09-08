-- ---------------------------------------------------------------------------
-- CANCELAMENTO DE RESERVA
--
-- A reserva passa a ter estado, em vez de apenas existir ou não existir.
--
-- POR QUE CANCELAR, E NÃO APAGAR
--
-- Apagar a linha destrói a informação de que a reserva existiu. "Quem cancelou a
-- aula de sexta, quando, e por quê" é exatamente o tipo de pergunta que um
-- sistema acadêmico precisa responder, e é o que a entrega de registros de
-- auditoria vai exigir.
--
-- O CUIDADO COM AS CONSTRAINTS
--
-- As três constraints de exclusão não sabem o que é uma reserva cancelada: a
-- linha continua na tabela e continuaria bloqueando o horário. Cancelar não
-- liberaria a sala, que é o oposto do objetivo.
--
-- Por isso elas são recriadas abaixo com "where (status = 'active')". A cláusula
-- restringe o índice às reservas ativas, e o horário volta a ficar livre no
-- mesmo instante do cancelamento.
-- ---------------------------------------------------------------------------

create type public.booking_status as enum ('active', 'cancelled');

alter table public.bookings
  add column status public.booking_status not null default 'active';

-- Quem cancelou e por quê. Nulos enquanto a reserva está ativa, e é o check
-- abaixo que impede uma reserva cancelada sem data de cancelamento.
alter table public.bookings
  add column cancelled_at timestamptz,
  add column cancellation_reason text;

-- O estado e seus dados precisam concordar. Sem isto, uma reserva poderia ficar
-- marcada como cancelada sem que ninguém soubesse quando, ou carregar uma data
-- de cancelamento estando ativa.
alter table public.bookings
  add constraint bookings_cancellation_consistent
  check (
    (status = 'active'    and cancelled_at is null) or
    (status = 'cancelled' and cancelled_at is not null)
  );

create index bookings_status_idx on public.bookings (status);


-- ---------------------------------------------------------------------------
-- As constraints de sobreposição passam a valer só entre reservas ativas.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

alter table public.bookings drop constraint bookings_no_room_overlap;
alter table public.bookings drop constraint bookings_no_professor_overlap;
alter table public.bookings drop constraint bookings_no_class_overlap;

alter table public.bookings
  add constraint bookings_no_room_overlap
  exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'active');

alter table public.bookings
  add constraint bookings_no_professor_overlap
  exclude using gist (
    professor_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'active');

alter table public.bookings
  add constraint bookings_no_class_overlap
  exclude using gist (
    class_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'active');


-- ---------------------------------------------------------------------------
-- CANCELAR É UMA OPERAÇÃO, NÃO UM UPDATE
--
-- Poderia ser um update direto pela API, e é justamente o que a função evita.
-- Ela garante que as três colunas mudem juntas, recusa cancelar o que já está
-- cancelado, e recusa cancelar uma reserva que já terminou, porque cancelar o
-- passado não muda nada e só sujaria o histórico.
--
-- O retorno diz o que aconteceu, em vez de falhar em silêncio quando nada foi
-- alterado.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_reason text default null
)
returns text
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_status public.booking_status;
  v_ends_at timestamptz;
begin
  select status, ends_at into v_status, v_ends_at
    from public.bookings
   where id = p_booking_id
   -- Trava a linha até o fim da transação: sem isto, dois cancelamentos
   -- simultâneos poderiam ler "active" ao mesmo tempo e gravar dois registros
   -- de cancelamento diferentes.
   for update;

  if not found then
    return 'not_found';
  end if;

  if v_status = 'cancelled' then
    return 'already_cancelled';
  end if;

  if v_ends_at <= now() then
    return 'already_finished';
  end if;

  update public.bookings
     set status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = nullif(trim(coalesce(p_reason, '')), '')
   where id = p_booking_id;

  return 'cancelled';
end;
$$;
