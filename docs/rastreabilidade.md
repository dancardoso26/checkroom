# Rastreabilidade: do requisito ao código e ao teste

Dado um requisito (RF) ou uma regra (RN) da monografia, esta página aponta onde
está a regra, onde está a tela e qual teste a cobre. Todos os caminhos partem da
pasta `CheckRoom/`.

## Como o código está organizado

| Pasta | O que mora nela |
|---|---|
| `src/domain/` | Regras de negócio, funções puras e testadas. Cada regra tem um `.test.ts` ao lado |
| `src/app/` | Telas e Server Actions. Cada pasta é uma URL; `acoes.ts` guarda as ações da tela |
| `src/lib/` | Infraestrutura: Supabase, repositórios, e-mail, sessão, datas |
| `src/hooks/` | Estado de tabela, pesquisa e ordenação usados pelas telas |
| `supabase/migrations/` | O esquema do banco, onde as regras de conflito e de papel também são garantidas |
| `tests/e2e/` | Testes de ponta a ponta (Playwright) contra o banco de desenvolvimento |

## Requisitos funcionais

| RF | Requisito | Regra | Tela | Teste |
|---|---|---|---|---|
| RF01 | Autenticar usuário | `src/domain/auth/senha.ts`, `src/domain/auth/destino-apos-login.ts`, `src/lib/sessao.ts`, `src/proxy.ts` | `src/app/login/` | `src/domain/auth/senha.test.ts`, `src/domain/auth/destino-apos-login.test.ts`, `tests/e2e/autenticacao.spec.ts` |
| RF02 | Verificar o segundo fator | `src/domain/auth/segundo-fator.ts` | `src/app/verificacao/` | `src/domain/auth/segundo-fator.test.ts`, `tests/e2e/autenticacao.spec.ts` |
| RF03 | Recuperar senha | `src/domain/auth/troca-de-senha.ts` | `src/app/recuperar-senha/`, `src/app/nova-senha/`, `src/app/auth/confirmar/route.ts` | `src/domain/auth/troca-de-senha.test.ts`, `tests/e2e/autenticacao.spec.ts` |
| RF04 | Aceitar termos e política | `src/domain/documentos/documentos.ts` | `src/app/aceitar-termos/`, `src/app/(documentos)/` | `src/domain/documentos/documentos.test.ts`, `tests/e2e/autenticacao.spec.ts` |
| RF05 | Convidar usuário | `src/domain/auth/permissoes.ts`, `supabase/migrations/20260926000100_cadastro_seguro.sql` | `src/app/(sistema)/configuracoes/usuarios/convidar-usuario.tsx` | `tests/e2e/usuarios.spec.ts` |
| RF06 | Gerenciar contas de usuário | `src/domain/auth/permissoes.ts`, `supabase/migrations/20260924000200_alterar_papel.sql` | `src/app/(sistema)/configuracoes/usuarios/` | `src/domain/auth/permissoes.test.ts`, `tests/e2e/usuarios.spec.ts` |
| RF07 | Excluir a própria conta | `supabase/migrations/20260922000400_anonimizar_conta.sql` | `src/app/(sistema)/conta/` | `tests/e2e/usuarios.spec.ts` |
| RF08 | Consultar a agenda de ocupação | `src/domain/agenda/`, `src/domain/tabela/` | `src/app/(sistema)/reservas/` (`page.tsx`, `agenda/`) | `src/domain/agenda/navegacao-da-agenda.test.ts`, `src/domain/agenda/filtros-da-agenda.test.ts`, `tests/e2e/agenda.spec.ts`, `tests/e2e/permissoes-da-agenda.spec.ts` |
| RF09 | Avaliar os espaços compatíveis | `src/domain/booking/evaluateRooms.ts` | `src/app/(sistema)/reservas/formulario/` | `src/domain/booking/evaluateRooms.test.ts`, `tests/e2e/criar-reserva.spec.ts` |
| RF10 | Registrar reserva de espaço | `src/domain/booking/validateBooking.ts`, `src/domain/booking/messages.ts` | `src/app/(sistema)/reservas/formulario/`, ação em `src/app/(sistema)/reservas/acoes/criar.ts` | `src/domain/booking/validateBooking.test.ts`, `tests/e2e/criar-reserva.spec.ts`, `tests/e2e/constraints-do-banco.spec.ts` |
| RF11 | Cancelar reserva | `src/app/(sistema)/reservas/acoes/cancelar.ts`, `supabase/migrations/20260908000400_booking_cancellation.sql` | `src/app/(sistema)/reservas/agenda/cancelar-reserva.tsx` | `tests/e2e/cancelar-reserva.spec.ts` |
| RF12 | Excluir reserva | `src/app/(sistema)/reservas/acoes/excluir.ts` | `src/app/(sistema)/reservas/agenda/excluir-reserva.tsx` | `tests/e2e/excluir-reserva.spec.ts` |
| RF13 | Notificar o professor | `src/app/(sistema)/reservas/acoes/notificar.ts`, `src/lib/email/` | sem tela (e-mail) | `src/lib/email/destinatario.test.ts`, `src/lib/email/remetente.test.ts` |
| RF14 | Consultar a trilha de auditoria | `src/domain/auditoria/descricao.ts`, `src/lib/repositories/repositorio-de-auditoria.ts` | `src/app/(sistema)/configuracoes/auditoria/` | `src/domain/auditoria/descricao.test.ts`, `tests/e2e/autenticacao.spec.ts` |
| RF15 | Gerenciar espaços e recursos | `src/domain/espacos/espaco.ts` | `src/app/(sistema)/configuracoes/espacos/`, `src/app/(sistema)/configuracoes/recursos/` | `src/domain/espacos/espaco.test.ts`, `tests/e2e/espacos.spec.ts` |
| RF16 | Gerenciar o cadastro acadêmico | `src/domain/academico/academico.ts` | `src/app/(sistema)/configuracoes/academico/` | `src/domain/academico/academico.test.ts`, `tests/e2e/cadastro-academico.spec.ts` |
| RF17 | Gerenciar o calendário letivo | `src/domain/calendario/calendario.ts` | `src/app/(sistema)/configuracoes/calendario/` | `src/domain/calendario/calendario.test.ts`, `tests/e2e/calendario-letivo.spec.ts` |
| RF18 | Abrir chamado | `src/domain/chamados/chamado.ts` | `src/app/(sistema)/chamados/` | `src/domain/chamados/chamado.test.ts`, `tests/e2e/chamados.spec.ts` |
| RF19 | Atender chamado | `src/domain/chamados/chamado.ts` | `src/app/(sistema)/chamados/` | `src/domain/chamados/chamado.test.ts`, `tests/e2e/chamados.spec.ts` |
| RF20 | Notificar o solicitante do chamado | `src/app/(sistema)/chamados/acoes.ts`, `src/lib/email/` | sem tela (e-mail) | sem teste dedicado |
| RF21 | Cadastrar palestra | `src/domain/palestras/palestra.ts`, `supabase/migrations/20261012000400_palestras.sql` | `src/app/(sistema)/palestras/` | `src/domain/palestras/palestra.test.ts`, `tests/e2e/palestras.spec.ts` |
| RF22 | Notificar os alunos sobre nova palestra e o palestrante, quando escolhido da lista de professores | `src/app/(sistema)/palestras/acoes.ts`, `src/domain/palestras/palestrante.ts`, `src/lib/email/` | sem tela (e-mail) | `palestrante.test.ts` cobre o reconhecimento do professor; o envio não tem teste dedicado |
| RF23 | Inscrever-se em palestra | `src/domain/palestras/palestra.ts`, `supabase/migrations/20261106000100_conflito_de_horario_na_inscricao.sql` | `src/app/(sistema)/palestras/` | `src/domain/palestras/palestra.test.ts`, `tests/e2e/palestras.spec.ts` |
| RF24 | Consultar o painel de métricas | `src/domain/painel/` (`periodo.ts`, `ocupacao.ts`, `indicadores.ts`, `serie-temporal.ts`, `comparacao.ts`) | `src/app/(sistema)/dashboard/` | `src/domain/painel/indicadores.test.ts`, `src/domain/painel/ocupacao.test.ts`, `tests/e2e/painel.spec.ts` |

## Regras de negócio

| RN | Regra | Onde é garantida | Teste |
|---|---|---|---|
| RN01 | Acesso exige senha, segundo fator e aceite da versão vigente | `src/proxy.ts`, `src/lib/sessao.ts`, `src/domain/documentos/documentos.ts` | `tests/e2e/autenticacao.spec.ts` |
| RN02 | Falhas não revelam se o e-mail tem conta; troca de senha exige link ou segundo fator | `src/app/login/acoes.ts`, `src/app/recuperar-senha/acoes.ts`, `src/domain/auth/troca-de-senha.ts` | `src/domain/auth/troca-de-senha.test.ts`, `tests/e2e/autenticacao.spec.ts` |
| RN03 | Conta nasce como aluno; só o administrador define o papel | `src/domain/auth/permissoes.ts`, `supabase/migrations/20260926000100_cadastro_seguro.sql` | `src/domain/auth/permissoes.test.ts`, `tests/e2e/usuarios.spec.ts` |
| RN04 | O master não é removido nem rebaixado; ninguém altera a própria conta | `supabase/migrations/20260926000000_administrador_master.sql`, `supabase/migrations/20260924000100_administrador_unico.sql` | `tests/e2e/usuarios.spec.ts` |
| RN05 | Remover conta é anonimizar | `supabase/migrations/20260922000400_anonimizar_conta.sql` | `tests/e2e/usuarios.spec.ts` |
| RN06 | Quem pode reservar, cancelar e excluir | `src/domain/auth/permissoes.ts`, `supabase/migrations/20260922000300_row_level_security_policies.sql` | `src/domain/auth/permissoes.test.ts`, `tests/e2e/permissoes-da-agenda.spec.ts`, `tests/e2e/autenticacao.spec.ts` |
| RN07 | Futuro, mesmo dia, entre 7h e 22h, com finalidade | `src/domain/booking/validateBooking.ts`, `src/domain/booking/businessHours.ts` | `src/domain/booking/validateBooking.test.ts` |
| RN08 | Sem sobreposição de espaço, professor ou turma | `src/domain/booking/evaluateRooms.ts`, `supabase/migrations/20260904000200_booking_constraints.sql` | `tests/e2e/constraints-do-banco.spec.ts`, `src/domain/booking/evaluateRooms.test.ts` |
| RN09 | Aula exige disciplina e vínculo no período | `src/domain/booking/validateBooking.ts`, `supabase/migrations/20260908000100_create_booking_with_subject.sql` | `src/domain/booking/validateBooking.test.ts` |
| RN10 | O espaço comporta a turma e tem os recursos | `src/domain/booking/evaluateRooms.ts`, `supabase/migrations/20261106000200_alunos_da_turma_pela_contagem.sql` | `src/domain/booking/evaluateRooms.test.ts`, `tests/e2e/criar-reserva.spec.ts` |
| RN11 | Cancelamento exige motivo e libera o horário | `src/app/(sistema)/reservas/acoes/cancelar.ts`, `supabase/migrations/20260908000400_booking_cancellation.sql` | `tests/e2e/cancelar-reserva.spec.ts` |
| RN12 | Alterações e acessos vão para a auditoria | `supabase/migrations/20260922000200_audit_log.sql`, `src/domain/auditoria/descricao.ts` | `src/domain/auditoria/descricao.test.ts`, `tests/e2e/excluir-reserva.spec.ts` |
| RN13 | Falha de e-mail não desfaz a operação | `src/app/(sistema)/reservas/acoes/notificar.ts`, `src/lib/email/enviar.tsx` | sem teste dedicado |
| RN14 | Cadastro em uso não é excluído; reserva respeita período letivo e bloqueios | `src/domain/espacos/espaco.ts`, `src/domain/academico/academico.ts`, `src/domain/calendario/calendario.ts` | `tests/e2e/espacos.spec.ts`, `tests/e2e/cadastro-academico.spec.ts`, `tests/e2e/calendario-letivo.spec.ts` |
| RN15 | Fluxo do chamado e papéis | `src/domain/chamados/chamado.ts`, `supabase/migrations/20261012000300_chamados.sql` | `src/domain/chamados/chamado.test.ts`, `tests/e2e/chamados.spec.ts` |
| RN16 | Regras da palestra e da inscrição | `src/domain/palestras/palestra.ts`, `supabase/migrations/20261012000400_palestras.sql` | `src/domain/palestras/palestra.test.ts`, `tests/e2e/palestras.spec.ts` |
| RN17 | Painel exclusivo do administrador | `src/domain/auth/permissoes.ts` (`podeVerPainel`) | `tests/e2e/painel.spec.ts` |

## Lacunas conhecidas

- RF13, RF20, RF22 e RN13 (e-mails) não têm teste automatizado dedicado: os
  e-mails de reservas de teste são suprimidos pelo prefixo `[e2e]`, e os testes
  em `src/lib/email/` cobrem só destinatário e remetente.
- Os nomes de `src/domain/booking/` seguem em inglês (`validateBooking`,
  `evaluateRooms`, `businessHours`), por acompanharem as funções que o Guia de
  estudo e a monografia citam.
