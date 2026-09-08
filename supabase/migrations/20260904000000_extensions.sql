-- ---------------------------------------------------------------------------
-- EXTENSOES DO POSTGRESQL
--
-- btree_gist e o que permite misturar, em um mesmo indice GiST, uma coluna de
-- igualdade simples (room_id, professor_id, class_id) com uma coluna de
-- intervalo (o periodo da reserva).
--
-- Sem ela, a constraint EXCLUDE da migration 20260904000200 nao pode ser
-- criada: o GiST sozinho nao sabe indexar uuid com o operador "=". Essa
-- constraint e o que garante, no proprio banco, que duas reservas nao se
-- sobreponham, mesmo que duas requisicoes cheguem no mesmo instante e passem
-- as duas pela validacao da aplicacao.
--
-- O schema "extensions" e uma convencao do Supabase: extensoes ficam fora do
-- schema public para nao poluir a API gerada. Ele ja faz parte do search_path
-- do banco, entao os operadores continuam visiveis normalmente.
-- ---------------------------------------------------------------------------

create extension if not exists btree_gist with schema extensions;
