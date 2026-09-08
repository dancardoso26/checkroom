# Banco de dados do CheckRoom

O GitHub guarda o código, o Supabase hospeda o banco em execução. São coisas
distintas, e o plano de ensino avalia o repositório. Por isso todo o SQL que
define o banco vive aqui, versionado, e não apenas dentro do painel do Supabase.

Quem clonar este repositório consegue reconstruir o banco inteiro do zero
executando os arquivos abaixo na ordem.

## Ordem de aplicação

Abra o **SQL Editor** do projeto no Supabase e execute um arquivo por vez, na
ordem numérica. A ordem importa: as constraints dependem das tabelas, que
dependem da extensão.

| Ordem | Arquivo | O que faz |
|---|---|---|
| 1 | `migrations/20260904000000_extensions.sql` | Instala `btree_gist` |
| 2 | `migrations/20260904000100_core_schema.sql` | Cria as oito tabelas e o enum `room_type` |
| 3 | `migrations/20260904000200_booking_constraints.sql` | Cria as três constraints de sobreposição |
| 4 | `migrations/20260904000300_row_level_security.sql` | Habilita RLS em todas as tabelas |
| 5 | `migrations/20260907000000_create_booking_function.sql` | Cria `create_booking`, a gravação atômica |
| 6 | `migrations/20260907000100_grants.sql` | Concede acesso às tabelas ao papel do servidor |
| 7 | `migrations/20260907000200_booking_created_by.sql` | Acrescenta quem registrou a reserva |
| 8 | `migrations/20260908000000_academic_context.sql` | Cria `subjects` e `teaching_assignments`, e a disciplina na reserva |
| 9 | `migrations/20260908000100_create_booking_with_subject.sql` | Atualiza `create_booking` para gravar a disciplina |
| 10 | `migrations/20260908000200_activity_type.sql` | Cria o tipo de atividade e a coluna em `bookings` |
| 11 | `migrations/20260908000300_create_booking_with_activity_type.sql` | Atualiza `create_booking` para gravar o tipo |
| 12 | `migrations/20260908000400_booking_cancellation.sql` | Cancelamento, e as constraints valendo só entre reservas ativas |
| 13 | `seed.sql` | Popula com dados de exemplo (opcional, só em desenvolvimento) |

O `seed.sql` **apaga** o conteúdo das tabelas antes de inserir. É intencional,
para que ele possa ser reexecutado durante o desenvolvimento, mas não deve ser
usado em um banco com dados reais.

## Por que não usar o Supabase CLI

O CLI aplicaria as migrations automaticamente, mas exigiria Docker instalado e
um vínculo local com o projeto. Como a entrega é o repositório e as migrations
já estão aqui em SQL puro, o ganho não compensa a dependência.

O CLI é usado apenas para uma coisa, e via `npx`, sem instalação:

```bash
npx supabase gen types typescript --project-id kalzmyjwqpphwxsmngbf > src/lib/supabase/database.types.ts
```

Esse comando gera os tipos TypeScript a partir do esquema real do banco. Ele
deve ser rodado sempre que uma migration alterar a estrutura das tabelas. É o
que sustenta a afirmação da seção 2.3 da monografia: escrever os tipos à mão
tornaria essa afirmação falsa, porque eles poderiam divergir do banco sem que
nada acusasse.

## Se uma migration falhar no meio

Cada arquivo é independente e pode ser reexecutado depois de corrigido, mas
`create table` não é idempotente: se metade do arquivo 2 rodou, é preciso
desfazer antes de tentar de novo. O caminho mais curto, em desenvolvimento, é
apagar tudo e recomeçar do arquivo 1:

```sql
drop schema public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
```

Isso destrói todos os dados do schema `public`. Enquanto o banco tem apenas
dados de exemplo, é seguro; depois da entrega, não é.

## Privilégio e RLS são coisas diferentes

Vale registrar, porque custou um erro para aparecer.

O PostgreSQL faz duas perguntas antes de devolver uma linha. A primeira é de
**privilégio**: este papel pode ler esta tabela? A segunda é de **RLS**: quais
linhas dela ele enxerga.

A migration `20260904000300` responde a segunda. A `20260907000100` responde a
primeira. Faltando a primeira, o erro é `permission denied for table X`, e
nenhuma política de RLS chega a ser avaliada.

A causa foi a opção **"Automatically expose new tables"**, desmarcada na criação
do projeto. Ela é o que concede privilégio automaticamente às tabelas novas.
Mantê-la desmarcada é a decisão certa, porque impede que uma tabela nasça
acessível pela API pública, mas obriga a conceder o acesso de forma explícita,
que é o que a migration de grants faz.

## Estado do RLS

Todas as tabelas têm Row Level Security habilitado e **nenhuma política**
definida. No PostgreSQL isso significa negar tudo, o que é o comportamento
desejado nesta etapa: o acesso acontece exclusivamente pelo servidor, com a
chave secreta, que ignora o RLS.

As políticas entram na entrega de **28/09**, junto com a autenticação. O
raciocínio completo está comentado no arquivo
`migrations/20260904000300_row_level_security.sql`.
