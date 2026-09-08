-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--
-- Estado desta etapa, e por que ele é assim.
--
-- O RLS do PostgreSQL decide, linha a linha, o que cada usuário pode ler ou
-- escrever. As políticas que expressam essa decisão dependem de auth.uid(),
-- que devolve o identificador do usuário autenticado na requisição.
--
-- Não existe autenticação ainda: ela é a entrega de 28/09. Sem login não há
-- auth.uid(), e uma política escrita agora ou seria falsa (liberando tudo) ou
-- bloquearia o sistema inteiro.
--
-- A decisão aqui é habilitar o RLS em todas as tabelas e NÃO criar política
-- nenhuma. No PostgreSQL, tabela com RLS habilitado e sem políticas nega tudo
-- por padrão. Na prática:
--
--   - a chave publishable, que roda no navegador, não lê nem escreve nada;
--   - a chave secreta, usada apenas dentro das Server Actions no servidor,
--     ignora o RLS e continua funcionando.
--
-- Ou seja, o acesso ao banco fica restrito ao servidor, que é exatamente a
-- arquitetura desta etapa. Habilitar o RLS agora, mesmo sem políticas, evita o
-- cenário pior: uma tabela esquecida sem RLS ficaria aberta ao mundo no dia em
-- que a chave publishable começasse a ser usada.
--
-- EM 28/09
--
-- Entram as políticas: professor lê e cria as próprias reservas, coordenação
-- enxerga as do seu curso, e as tabelas de catálogo (cursos, espaços, recursos)
-- ficam legíveis por qualquer usuário autenticado. Só então a monografia poderá
-- afirmar, com verdade, que a autorização é aplicada em duas camadas.
-- ---------------------------------------------------------------------------

alter table public.courses            enable row level security;
alter table public.professors         enable row level security;
alter table public.classes            enable row level security;
alter table public.rooms              enable row level security;
alter table public.resources          enable row level security;
alter table public.room_resources     enable row level security;
alter table public.bookings           enable row level security;
alter table public.booking_resources  enable row level security;
