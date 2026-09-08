-- ---------------------------------------------------------------------------
-- GRAVAÇÃO ATÔMICA DE UMA RESERVA
--
-- Criar uma reserva escreve em bookings e em booking_resources, e as duas
-- precisam acontecer juntas ou nenhuma acontecer.
--
-- Isso não se resolve no TypeScript: a biblioteca do Supabase conversa pela API
-- REST, e cada chamada é uma transação separada. Dois inserts seguidos deixariam
-- uma reserva gravada sem os recursos que exige caso o segundo falhasse. Apagar
-- a primeira como compensação é pior, porque essa exclusão também pode falhar.
--
-- Uma função em plpgsql roda inteira dentro de uma única transação. Se qualquer
-- comando falhar, incluindo uma das constraints de exclusão, o PostgreSQL desfaz
-- tudo. É a mesma razão que justifica as constraints: a integridade fica no
-- banco, e não na confiança de que o código fará a sequência certa.
-- ---------------------------------------------------------------------------

create or replace function public.create_booking(
  p_room_id uuid,
  p_professor_id uuid,
  p_class_id uuid,
  p_purpose text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_resource_ids uuid[]
)
returns uuid
language plpgsql
-- search_path fixo: sem isto, quem chama poderia alterá-lo e fazer "bookings"
-- apontar para uma tabela própria em outro schema.
set search_path = pg_catalog, public
as $$
declare
  v_booking_id uuid;
begin
  insert into public.bookings (
    room_id, professor_id, class_id, purpose, starts_at, ends_at
  )
  values (
    p_room_id, p_professor_id, p_class_id, p_purpose, p_starts_at, p_ends_at
  )
  returning id into v_booking_id;

  -- Reserva sem recurso é comum: uma aula expositiva não precisa de nada além
  -- da sala. O coalesce trata o array nulo como vazio.
  insert into public.booking_resources (booking_id, resource_id)
  select v_booking_id, resource_id
  from unnest(coalesce(p_resource_ids, array[]::uuid[])) as resource_id
  -- Segunda barreira contra duplicatas, para o caso de a função ser chamada por
  -- outro caminho que não a aplicação.
  on conflict (booking_id, resource_id) do nothing;

  return v_booking_id;
end;
$$;

-- A função NÃO é security definer, e não deve virar. Em 28/09, quando o RLS
-- ganhar políticas, marcá-la assim seria um jeito rápido de passar por cima
-- delas, e também uma porta aberta: qualquer usuário autenticado poderia criar
-- reserva em nome de terceiros.
