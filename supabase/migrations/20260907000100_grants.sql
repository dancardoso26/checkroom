-- ---------------------------------------------------------------------------
-- PRIVILÉGIOS DE ACESSO ÀS TABELAS
--
-- Esta migration corrige um "permission denied for table rooms" que aparecia em
-- toda consulta feita pela aplicação. Vale entender a causa, porque ela mostra
-- que RLS e privilégio são duas coisas diferentes.
--
-- AS DUAS BARREIRAS DO POSTGRESQL
--
-- Antes de qualquer política de Row Level Security ser avaliada, o PostgreSQL
-- pergunta se o papel que faz a consulta tem PRIVILÉGIO sobre a tabela. É a
-- pergunta mais antiga e mais grosseira do banco: "você pode ler esta tabela?".
--
-- Só depois de passar por ela é que o RLS entra, para decidir QUAIS LINHAS
-- daquela tabela o papel enxerga.
--
-- A migration 20260904000300 cuidou da segunda barreira. A primeira ficou
-- faltando, e é a que o erro acusava.
--
-- POR QUE FALTOU
--
-- Ao criar o projeto, a opção "Automatically expose new tables" foi desmarcada
-- de propósito. É ela que concede privilégios automaticamente aos papéis da API
-- a cada tabela nova. Desmarcada, nenhuma tabela criada aqui recebeu privilégio
-- nenhum, e nem mesmo o servidor conseguia ler.
--
-- A decisão de desmarcar continua certa: com ela ligada, toda tabela nova
-- nasceria acessível pela API pública, e bastaria esquecer o RLS uma vez para
-- expor dados. Desligada, o acesso é concedido a quem precisa, de forma
-- explícita e versionada, que é o que este arquivo faz.
--
-- QUEM RECEBE, E QUEM NÃO RECEBE
--
--   service_role  : o papel da chave secreta, usada apenas no servidor dentro
--                   das Server Actions. Recebe acesso total.
--
--   anon          : o papel de quem não fez login. NÃO recebe nada.
--   authenticated : o papel de quem fez login. NÃO recebe nada por enquanto.
--
-- Os dois últimos entram em 28/09, junto com as políticas de RLS. Hoje o
-- navegador não fala com o banco, e o que este arquivo faz é tornar isso uma
-- garantia do banco em vez de uma promessa do código.
-- ---------------------------------------------------------------------------

grant usage on schema public to service_role;

-- Vale para as oito tabelas que já existem.
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- ---------------------------------------------------------------------------
-- E vale para as próximas.
--
-- Sem este bloco, cada tabela criada nas entregas seguintes (chamados, perfis,
-- registros de auditoria) reproduziria o mesmo erro, e o motivo já teria sido
-- esquecido. "alter default privileges" instrui o banco a conceder o mesmo
-- acesso automaticamente a tudo que o papel postgres criar daqui em diante
-- neste schema.
-- ---------------------------------------------------------------------------
alter default privileges in schema public
  grant all privileges on tables to service_role;

alter default privileges in schema public
  grant all privileges on sequences to service_role;

alter default privileges in schema public
  grant execute on functions to service_role;
