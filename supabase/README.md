# Banco de dados do CheckRoom

O GitHub guarda o código, o Supabase hospeda o banco em execução. São coisas
distintas, e o plano de ensino avalia o repositório. Por isso todo o SQL que
define o banco vive aqui, versionado, e não apenas dentro do painel do Supabase.

Quem clonar este repositório consegue reconstruir o banco inteiro do zero
executando os arquivos abaixo na ordem.

## Duas pastas, dois propósitos

| Pasta | Para quê |
|---|---|
| `migrations/` | **Executar.** O histórico de todas as mudanças, em ordem. Uma função alterada três vezes aparece em três arquivos, e vale a do mais recente |
| `estado-atual/` | **Ler.** A foto do banco hoje, um arquivo por assunto, já na versão final. Não é executada |

Para entender uma regra do banco, abra `estado-atual/`. Cada arquivo junta a
tabela, as constraints, as funções, as políticas de RLS e os gatilhos do
assunto:

| Arquivo | Conteúdo |
|---|---|
| `reservas.sql` | `bookings` e recursos da reserva, sobreposição, `travar_espaco`, `create_booking`, `cancel_booking` |
| `palestras.sql` | palestras, cursos de destino, inscrições, `cadastrar_palestra`, `inscrever_em_palestra` |
| `chamados.sql` | `tickets` e as transições assumir, devolver, resolver, cancelar e excluir |
| `usuarios-e-permissoes.sql` | `profiles`, papéis, funções de permissão (`eh_admin`, `papel_atual`...), troca de papel e anonimização |
| `cadastros.sql` | cursos, professores, turmas, disciplinas, vínculos, espaços e recursos |
| `calendario.sql` | períodos letivos e bloqueios do calendário |
| `auditoria.sql` | `audit_logs` e a função `log_audit_event` usada pelos gatilhos |
| `tempo-real.sql` | tabelas publicadas no Realtime |

O nome do arquivo segue o assunto do código: `app/(sistema)/chamados/acoes.ts`,
`domain/chamados/`, `lib/repositories/repositorio-de-chamados.ts` e
`supabase/estado-atual/chamados.sql`.

Toda migration nova precisa refletir aqui: o objeto alterado é atualizado no
arquivo do assunto correspondente.

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
| 13 | `migrations/20260922000000_profiles_and_roles.sql` | Cria `profiles`, o enum de papéis e a trigger que dá profile a toda conta |
| 14 | `migrations/20260922000100_booking_authorship.sql` | Torna `created_by` obrigatória e acrescenta o autor a `create_booking` |
| 15 | `migrations/20260922000200_audit_log.sql` | Cria `audit_logs` e a trigger que registra mudanças em `bookings` |
| 16 | `migrations/20260922000300_row_level_security_policies.sql` | Concede acesso ao papel `authenticated` e cria as políticas de RLS |
| 17 | `migrations/20260922000400_anonimizar_conta.sql` | Cria a função que anonimiza o perfil e cancela as reservas futuras |
| 18 | `migrations/20260924000000_gestao_de_usuarios.sql` | Remoção de usuário pela administração, por anonimização |
| 19 | `migrations/20260924000100_administrador_unico.sql` | Administrador único (substituída pela 21) |
| 20 | `migrations/20260924000200_alterar_papel.sql` | Cria `alterar_papel`, com registro na auditoria |
| 21 | `migrations/20260926000000_administrador_master.sql` | Vários administradores, com um master que não pode ser removido |
| 22 | `migrations/20260926000100_cadastro_seguro.sql` | Conta nasce como aluno; e-mail do professor oculto da sessão |
| 23 | `migrations/20261012000000_curso_do_aluno.sql` | Curso do aluno em `profiles`, gravado junto com o papel |
| 24 | `migrations/20261012000100_cadastro_de_espacos.sql` | Escrita de espaços e recursos pela administração, com auditoria |
| 25 | `migrations/20261012000200_cadastro_academico.sql` | Escrita de cursos, disciplinas, turmas, professores e vínculos, com auditoria |
| 26 | `migrations/20261012000300_chamados.sql` | Cria `tickets` e as transições assumir, resolver e cancelar |
| 27 | `migrations/20261012000400_palestras.sql` | Cria palestras, cursos de destino e inscrições; trava comum com a reserva |
| 28 | `migrations/20261012000500_calendario_letivo.sql` | Cria períodos letivos e bloqueios do calendário |
| 29 | `migrations/20261012000600_codigo_dos_espacos.sql` | Espaços por prédio, andar e sala, com o código (3T-12) calculado |
| 30 | `migrations/20261105000000_master_atende_chamados.sql` | O master também assume e resolve chamados de TI (`eh_master`) |
| 31 | `migrations/20261105000100_master_exclui_chamados.sql` | Cria `excluir_chamado`, exclusiva do master |
| 32 | `migrations/20261106000000_turma_do_aluno.sql` | Turma do aluno em `profiles`, com o curso alinhado pela turma; `alterar_papel` passa a receber a turma |
| 33 | `migrations/20261106000100_conflito_de_horario_na_inscricao.sql` | Inscrição em palestra recusada quando choca com outra do mesmo aluno |
| 34 | `migrations/20261106000200_alunos_da_turma_pela_contagem.sql` | Remove `classes.student_count`; a contagem passa a vir dos alunos vinculados |
| 35 | `migrations/20261106000300_professor_no_lugar_de_docente.sql` | Troca "Docente" por "Professor" nas mensagens, na anonimização e nos registros existentes |
| 36 | `migrations/20261106000400_palestrante_professor.sql` | Guarda o professor palestrante em `lectures` e recria `cadastrar_palestra` com ele |
| 37 | `migrations/20261107000000_tempo_real.sql` | Liga o Realtime em `bookings`, `lectures`, `lecture_enrollments` e `tickets`, para as telas se atualizarem sozinhas |
| 38 | `migrations/20261107000100_ti_sem_agenda.sql` | A equipe de TI deixa de ler reservas e palestras: só atende chamados |
| 39 | `migrations/20261107000200_devolver_chamado.sql` | Cria `devolver_chamado`: quem assumiu (ou o master) devolve o chamado à fila |
| 40 | `seed.sql` | Popula o mundo acadêmico (opcional, só em desenvolvimento) |

Depois do `seed.sql`, rode no terminal:

```bash
npm run seed:usuarios
```

Ele cria as contas de demonstração e as três reservas. A ordem não é escolha de
estilo: `profiles` referencia `professors`, e `bookings` referencia `profiles`,
então as reservas não podem nascer no mesmo arquivo que cria os professores.

O `seed.sql` **apaga** o conteúdo das tabelas antes de inserir, inclusive
`profiles`. É intencional, para que possa ser reexecutado durante o
desenvolvimento, mas deixa contas órfãs em `auth.users` até o
`npm run seed:usuarios` rodar, que começa justamente removendo-as. Nada disso
deve ser usado em um banco com dados reais.

## Por que não usar o Supabase CLI

O CLI aplicaria as migrations automaticamente, mas exigiria Docker instalado e
um vínculo local com o projeto. Como a entrega é o repositório e as migrations
já estão aqui em SQL puro, o ganho não compensa a dependência.

O CLI é usado apenas para uma coisa, e via `npx`, sem instalação:

```bash
npm run types
```

O script envolve esse comando do CLI porque o redirecionamento do PowerShell
grava em UTF-16, que o TypeScript aceita mas suja o diff do git. Ele também
extrai o identificador do projeto da URL em `.env.local`, em vez de deixá-lo
fixo aqui, onde poderia divergir do projeto em uso.

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

Todas as tabelas têm Row Level Security habilitado. As políticas estão sendo
escritas nesta entrega, junto com a autenticação: enquanto não existirem, o
PostgreSQL nega tudo a quem não é `service_role`, que é o comportamento
desejado no intervalo.
