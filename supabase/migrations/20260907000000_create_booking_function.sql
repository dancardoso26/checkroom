-- ---------------------------------------------------------------------------
-- GRAVAÇÃO ATÔMICA DE UMA RESERVA
--
-- Criar uma reserva escreve em duas tabelas: a linha em bookings e uma linha
-- por recurso exigido em booking_resources. As duas precisam acontecer juntas
-- ou nenhuma acontecer.
--
-- POR QUE ISSO NÃO PODE SER RESOLVIDO NO TYPESCRIPT
--
-- A biblioteca do Supabase conversa com o banco pela API REST, e cada chamada é
-- uma transação separada. Dois inserts seguidos a partir do código seriam duas
-- transações independentes: se a segunda falhasse, a primeira já estaria
-- gravada, e o sistema ficaria com uma reserva que não registra os recursos que
-- exige, exatamente a condição que a regra de negócio acabou de validar.
--
-- O contorno usual é apagar a primeira quando a segunda falha, o que é pior:
-- essa exclusão de compensação também pode falhar, e aí não há mais nada a
-- fazer. A solução correta é não deixar a operação sair pela metade, e isso só
-- existe dentro do banco.
--
-- Uma função em plpgsql roda inteira dentro de uma única transação. Se qualquer
-- comando falhar, incluindo uma das constraints de exclusão da migration
-- 20260904000200, o PostgreSQL desfaz tudo e a chamada devolve o erro.
--
-- É a mesma razão que justifica as constraints: a garantia de integridade fica
-- no banco, não na confiança de que o código sempre fará a sequência certa.
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
-- search_path fixo. Sem isto, quem chama a função poderia alterar o search_path
-- da sessão e fazer "bookings" apontar para uma tabela própria em outro schema.
-- É a recomendação do próprio Supabase para qualquer função do banco.
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

  -- Reserva sem exigência de recurso é comum: uma aula expositiva em sala
  -- comum não precisa de nada além da sala. O coalesce trata o array nulo como
  -- vazio, e o insert simplesmente não produz linha nenhuma nesse caso.
  insert into public.booking_resources (booking_id, resource_id)
  select v_booking_id, resource_id
  from unnest(coalesce(p_resource_ids, array[]::uuid[])) as resource_id
  -- O mesmo recurso enviado duas vezes violaria a chave primária composta. A
  -- regra de negócio já remove duplicatas antes de chegar aqui; esta linha é a
  -- segunda barreira, para o caso de a função ser chamada por outro caminho.
  on conflict (booking_id, resource_id) do nothing;

  return v_booking_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- SOBRE SEGURANÇA
--
-- A função NÃO é security definer. Ela executa com as permissões de quem chama,
-- o que hoje significa a chave secreta usada pelo servidor.
--
-- A tentação de marcá-la como security definer aparecerá em 28/09, quando o RLS
-- ganhar políticas: seria um jeito rápido de deixar a gravação passar por cima
-- delas. Seria também uma porta aberta, porque qualquer usuário autenticado
-- poderia chamá-la e criar reserva em nome de terceiros. A gravação deve
-- continuar respeitando as políticas.
-- ---------------------------------------------------------------------------
