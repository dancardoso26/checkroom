-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--
-- RLS habilitado em todas as tabelas e NENHUMA política definida. No PostgreSQL
-- isso significa negar tudo, que é o comportamento desejado nesta etapa:
--
--   a chave publishable, que roda no navegador, não lê nem escreve nada;
--   a chave secreta, usada só no servidor, ignora o RLS e continua funcionando.
--
-- As políticas dependem de auth.uid(), e sem login esse valor não existe. Uma
-- política escrita agora ou liberaria tudo ou bloquearia o sistema inteiro.
--
-- Habilitar sem políticas evita o cenário pior: uma tabela esquecida sem RLS
-- ficaria aberta no dia em que a chave publishable começasse a ser usada.
--
-- Em 28/09 entram as políticas de verdade, e só então a monografia poderá
-- afirmar com verdade que a autorização é aplicada em duas camadas.
-- ---------------------------------------------------------------------------

alter table public.courses            enable row level security;
alter table public.professors         enable row level security;
alter table public.classes            enable row level security;
alter table public.rooms              enable row level security;
alter table public.resources          enable row level security;
alter table public.room_resources     enable row level security;
alter table public.bookings           enable row level security;
alter table public.booking_resources  enable row level security;
