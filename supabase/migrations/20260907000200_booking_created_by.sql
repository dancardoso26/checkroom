-- ---------------------------------------------------------------------------
-- QUEM REGISTROU A RESERVA
--
-- professor_id responde "de quem é a aula". Esta coluna responde outra pergunta:
-- "quem registrou".
--
-- Na instituição os dois caminhos existem. O professor reserva o laboratório da
-- própria aula, e as duas colunas apontam para a mesma pessoa; mas a secretaria
-- também registra em nome dos professores, e aí são pessoas diferentes.
--
-- Com uma coluna só seria preciso escolher qual informação perder: registrar a
-- secretária como professora falsearia a agenda e apontaria o conflito de
-- professor para a pessoa errada; registrar só a professora apagaria o rastro de
-- quem criou.
--
-- Em 28/09 é esta coluna que responde "quem pode alterar esta reserva", e é ela
-- que sustenta os registros de auditoria: um log que não sabe quem executou a
-- ação não é um log.
--
-- Ela aceita nulo porque não existe usuário autenticado ainda, e não tem chave
-- estrangeira porque o alvo correto não existe: referenciar professors seria um
-- erro, já que a secretária não é professora. O destino é profiles, ligada a
-- auth.users, que entra em 28/09 junto com a obrigatoriedade e a FK.
--
-- Uma coluna uuid solta é frágil, e é uma fragilidade assumida e datada. A
-- alternativa seria criar agora uma tabela de usuários incompleta.
-- ---------------------------------------------------------------------------

-- "if not exists" torna o arquivo repetível. A primeira versão referenciava
-- professors e chegou a ser aplicada; sem a idempotência, corrigir exigiria
-- descobrir à mão o que já existe no banco.
alter table public.bookings
  add column if not exists created_by uuid;

-- Remove a chave estrangeira criada pela versão anterior. Se nunca existiu, esta
-- linha não faz nada.
alter table public.bookings
  drop constraint if exists bookings_created_by_fkey;

comment on column public.bookings.created_by is
  'Quem registrou a reserva, que nem sempre é o professor da aula. Passa a referenciar profiles(id) e a ser obrigatória na entrega de 28/09. Nulo nas reservas criadas antes disso.';

-- "reservas que eu registrei" é a base da tela de acompanhamento da secretaria.
create index if not exists bookings_created_by_idx
  on public.bookings (created_by);
