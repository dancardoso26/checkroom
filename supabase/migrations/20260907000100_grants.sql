-- ---------------------------------------------------------------------------
-- PRIVILÉGIOS DE ACESSO ÀS TABELAS
--
-- Corrige um "permission denied for table rooms" que aparecia em toda consulta,
-- e a causa mostra que RLS e privilégio são coisas diferentes.
--
-- Antes de avaliar qualquer política de RLS, o PostgreSQL pergunta se o papel
-- tem PRIVILÉGIO sobre a tabela. Só depois o RLS decide QUAIS LINHAS ele vê. A
-- migration 20260904000300 cuidou da segunda pergunta; esta cuida da primeira.
--
-- Faltou porque a opção "Automatically expose new tables" foi desmarcada ao
-- criar o projeto. Ela concede privilégios automaticamente a cada tabela nova, e
-- sem ela nem o servidor conseguia ler.
--
-- Mantê-la desmarcada continua certo: ligada, toda tabela nova nasceria
-- acessível pela API pública, e bastaria esquecer o RLS uma vez para expor
-- dados. Desligada, o acesso é concedido de forma explícita e versionada.
--
-- Só service_role recebe, que é o papel da chave secreta usada no servidor. Os
-- papéis anon e authenticated não recebem nada: entram em 28/09, junto com as
-- políticas. Hoje o navegador não fala com o banco, e este arquivo transforma
-- isso em garantia do banco em vez de promessa do código.
-- ---------------------------------------------------------------------------

grant usage on schema public to service_role;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Vale também para as próximas. Sem este bloco, cada tabela criada nas entregas
-- seguintes reproduziria o mesmo erro, com o motivo já esquecido.
alter default privileges in schema public
  grant all privileges on tables to service_role;

alter default privileges in schema public
  grant all privileges on sequences to service_role;

alter default privileges in schema public
  grant execute on functions to service_role;
