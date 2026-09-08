-- ---------------------------------------------------------------------------
-- QUEM REGISTROU A RESERVA
--
-- A tabela já responde "de quem é a aula", em professor_id. Esta coluna passa a
-- responder uma pergunta diferente: "quem registrou".
--
-- POR QUE SÃO DUAS PERGUNTAS
--
-- Na instituição, os dois caminhos existem. O professor entra no sistema e
-- reserva o laboratório da própria aula, e nesse caso as duas colunas apontam
-- para a mesma pessoa. Mas a secretaria também registra reservas em nome dos
-- professores, e aí a pessoa que criou não é a pessoa que vai dar a aula.
--
-- Com uma coluna só, o segundo caso obrigaria a escolher qual informação
-- perder. Registrar a secretária como professora falsearia a agenda e faria a
-- verificação de conflito de professor apontar para a pessoa errada. Registrar
-- só a professora apagaria o rastro de quem de fato criou o registro.
--
-- O QUE ISSO DESTRAVA
--
-- Em 28/09, com a autenticação, esta coluna é o que responde "quem pode alterar
-- esta reserva". E é ela que sustenta a entrega de registros de auditoria: um
-- log que não sabe quem executou a ação não é um log.
--
-- POR QUE AGORA, E NÃO EM 28/09
--
-- Acrescentar coluna em tabela vazia é trivial. Acrescentar depois, com
-- reservas gravadas, obriga a decidir o que colocar nas linhas antigas, e a
-- resposta honesta seria "não sabemos quem criou".
--
-- POR QUE ELA ACEITA NULO
--
-- Não existe usuário autenticado ainda, então não há o que gravar aqui. A
-- coluna nasce opcional e passa a ser obrigatória em 28/09, quando toda reserva
-- nova tiver um autor conhecido. Deixá-la obrigatória agora exigiria inventar
-- um autor, o que seria pior do que admitir que não se sabe.
--
-- POR QUE ELA NÃO TEM CHAVE ESTRANGEIRA AINDA
--
-- O destino natural seria referenciar professors, e seria um erro. A secretária
-- que registra a reserva não é professora, e uma referência a professors
-- tornaria impossível registrar exatamente o caso que motivou esta coluna.
--
-- O alvo correto é a tabela de usuários do sistema, que ainda não existe: ela
-- entra em 28/09 como profiles, ligada a auth.users, e abriga professores,
-- secretaria e coordenação. Nesse dia a chave estrangeira é acrescentada e a
-- coluna vira obrigatória.
--
-- Uma coluna uuid solta é frágil, e é uma fragilidade assumida e datada. A
-- alternativa seria criar agora uma tabela de usuários incompleta, que teria de
-- ser refeita quando o Supabase Auth entrar.
-- ---------------------------------------------------------------------------

-- "if not exists" nas três instruções abaixo torna este arquivo repetível.
--
-- A primeira versão dele referenciava professors, o que estava errado pelo
-- motivo explicado acima, e chegou a ser aplicada. Sem a idempotência, corrigir
-- exigiria descobrir manualmente o que já existe no banco e o que falta.
--
-- Vale como prática geral: uma migration que pode ser reexecutada sem erro é a
-- diferença entre corrigir um engano em um comando e passar meia hora
-- reconstruindo o estado do banco à mão.
alter table public.bookings
  add column if not exists created_by uuid;

-- Remove a chave estrangeira criada pela versão anterior deste arquivo. Se ela
-- nunca chegou a existir, esta linha não faz nada, que é o comportamento
-- desejado. O nome é o que o PostgreSQL gera por padrão para uma referência na
-- coluna created_by da tabela bookings.
alter table public.bookings
  drop constraint if exists bookings_created_by_fkey;

comment on column public.bookings.created_by is
  'Quem registrou a reserva, que nem sempre é o professor da aula. Passa a referenciar profiles(id) e a ser obrigatória na entrega de 28/09. Nulo nas reservas criadas antes disso.';

-- A consulta "reservas que eu registrei" é a base da tela de acompanhamento da
-- secretaria. Sem índice, ela varreria a tabela inteira.
create index if not exists bookings_created_by_idx
  on public.bookings (created_by);
