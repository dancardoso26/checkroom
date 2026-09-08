-- btree_gist permite misturar, no mesmo índice GiST, colunas de igualdade
-- (room_id, professor_id, class_id) com uma coluna de intervalo. É o que torna
-- possíveis as constraints EXCLUDE da migration 20260904000200.
--
-- O schema "extensions" é convenção do Supabase: mantém extensões fora do public
-- sem tirá-las do search_path.

create extension if not exists btree_gist with schema extensions;
