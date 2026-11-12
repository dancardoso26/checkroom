# Registro das medidas técnicas de segurança

Versão 1.0, de 12/11/2026. Atende ao item 9 da Seção 6 das orientações da
disciplina. Cada medida aponta onde está implementada e como foi verificada; a
verificação completa está em [evidencias-dos-controles.md](evidencias-dos-controles.md).

Este documento fica no repositório e não é publicado no site: a Seção 2.8 pede
que a política descreva as medidas "sem revelar detalhes que facilitem
ataques", e a política publicada traz só o resumo.

## Autenticação (orientações, 4.2)

| Medida | Onde | Verificação |
|---|---|---|
| Senha guardada como hash com sal (bcrypt), gerado e conferido pelo Supabase Auth | `auth.users` | Nenhuma coluna da aplicação guarda senha |
| Senha nunca registrada em log ou auditoria | `src/app/login/acoes.ts`: a falha registra só o e-mail digitado | Revisão do código |
| Regras mínimas de senha na definição e na troca | `src/domain/auth/senha.ts` | `senha.test.ts` |
| Segundo fator (TOTP) obrigatório para todos os papéis | `src/proxy.ts` exige sessão `aal2` em toda rota interna | E2E "exige o segundo fator antes de liberar o sistema" |
| Dispensa do segundo fator impossível em produção | `src/domain/auth/segundo-fator.ts` ignora `MFA_DISPENSADO_PARA` quando `NODE_ENV=production` | `segundo-fator.test.ts` |
| Troca de senha só com a sessão completa (segundo fator) ou aberta pelo link de convite ou de recuperação; a sessão aberta só com a senha não troca | `src/domain/auth/troca-de-senha.ts` | E2E "a sessão aberta só com a senha não troca a senha" |
| Recuperação de senha por link de uso único e com validade | Supabase Auth, `src/app/auth/confirmar/route.ts` | E2E dos links quebrado e vencido |
| Mensagem de erro de login não revela se o e-mail existe | `src/app/login/acoes.ts` | E2E "recusa senha incorreta sem dizer se o e-mail existe" |
| Limite de tentativas | Limites do Supabase Auth: 15 desafios de segundo fator por minuto por IP; janela de 60 s entre pedidos de recuperação | Configuração da plataforma (ver Limitações) |
| Redirecionamento após login só para rotas internas | `src/domain/auth/destino-apos-login.ts` | E2E "o login não segue destino que aponta para outro site" |
| Conta removida ou desativada perde o acesso na hora | `ban_duration` no Supabase Auth, em `conta/acoes.ts` e `configuracoes/usuarios/acoes.ts` | E2E "excluir um usuário apaga o que o identificava" |

## Autorização por perfil (orientações, 4.3)

| Medida | Onde | Verificação |
|---|---|---|
| RLS ligada em todas as tabelas de `public` | `supabase/estado-atual/*.sql` | Script `evidencias/controles-no-banco.sql` |
| O papel, o curso, a turma e o vínculo de professor só mudam pela administração | Trigger `impedir_troca_de_papel` | Script: aluno, professor e TI recusados |
| Transições de chamado só por funções que conferem papel e situação juntos; sem `update` direto | `chamados.sql`: sem permissão de `update` em `tickets` | Script: `update` recusado para os quatro papéis |
| A TI não lê reservas nem palestras; o aluno só lê as palestras do seu curso | Políticas "agenda visivel conforme o papel" e "palestra visivel conforme o papel" | Script: TI vê 0 reservas |
| O aluno só lê as reservas da própria turma | Mesma política, com `turma_atual()` | Script: 0 reservas de outra turma |
| O aluno não vê quem mais se inscreveu | Política "inscricao propria ou admin" e `inscritos_por_palestra`, que devolve só números | Script: 0 inscrições de outros |
| A mesma regra conferida também na aplicação, para dar a mensagem certa | `src/domain/auth/permissoes.ts` | `permissoes.test.ts` |
| A chave secreta, que ignora o RLS, só é usada no servidor e sempre depois da verificação de papel na Server Action (gestão de contas, e-mail do destinatário dos avisos, contagens do dashboard) | `src/lib/repositories/`, `src/lib/auditoria.ts` | Revisão do código em 12/11 |
| Administrador master não pode ser removido nem rebaixado | `impedir_troca_de_papel`, `anonimizar_perfil` | E2E "o master tem selo e nenhuma ação" |
| Funções `security definer` com `search_path` fixo e execução revogada de `anon` | Todas as funções do banco | Revisão do `estado-atual` |

## Banco, dados e segredos (orientações, 4.4)

| Medida | Onde |
|---|---|
| Consultas sempre pelo cliente do Supabase ou por funções com parâmetros; nenhuma SQL montada com texto | `src/lib/repositories/` |
| Integridade garantida pelo banco: exclusão de sobreposição, chaves estrangeiras, `check` de situação | `reservas.sql`, `chamados.sql` |
| Migrations versionadas e estado atual legível | `supabase/migrations/`, `supabase/estado-atual/` |
| Chaves só em variáveis de ambiente; `.env.local` no `.gitignore`; o repositório guarda só o `.env.example` | Raiz do projeto |
| Só a URL do projeto e a chave publicável chegam ao navegador | Variáveis `NEXT_PUBLIC_` |
| Banco criptografado em repouso e conexões com TLS | Supabase |

## Transporte e navegador

| Medida | Onde | Verificação |
|---|---|---|
| HTTPS obrigatório, com HSTS de dois anos | `next.config.ts` | E2E "as respostas trazem os cabeçalhos de segurança"; conferido no site em 12/11 |
| Página não pode ser embutida em outro site (`frame-ancestors 'none'`, `X-Frame-Options: DENY`) | `next.config.ts` | Mesmo teste |
| Formulários só enviam para o próprio site (`form-action 'self'`) | `next.config.ts` | Mesmo teste |
| Câmera, microfone, localização e pagamento bloqueados (`Permissions-Policy`) | `next.config.ts` | Mesmo teste |
| Cookie de sessão com `SameSite=Lax` e, em produção, `Secure` | `src/lib/supabase/opcoes-de-cookie.ts`, usado pelos três clientes do Supabase | Ver Limitações |

## Logs e auditoria (orientações, 4.5)

| Medida | Onde |
|---|---|
| Entradas, saídas, falhas de login, troca de senha, cadastro do segundo fator, aceite dos termos, convite, desativação e remoção de usuário | `src/lib/auditoria.ts` e chamadas nas Server Actions |
| Toda alteração em reservas, chamados, palestras, inscrições, cadastros e calendário, com estado anterior e posterior | Triggers `*_audit` com `log_audit_event()` |
| Auditoria só legível pela administração; ninguém grava nem apaga pela aplicação | Política "auditoria visivel a admin"; sem permissão de escrita para `authenticated` |
| Não são gravados senha, token, segredo de segundo fator nem cookie | Revisão do código |
| Ao remover uma conta, o e-mail da pessoa é apagado dos registros de auditoria | `anonimizar_perfil` |

## Limitações conhecidas

Registradas para não declarar conformidade sem demonstrá-la (orientações,
Seção 7). As três primeiras estão no `TASKS.md` com plano de correção.

1. **O segundo fator é exigido pela aplicação, mas não pelo banco.** As
   políticas de RLS conferem o papel, não o nível da sessão (`aal1` ou
   `aal2`). Quem descobrir a senha de alguém obtém uma sessão `aal1` e, com
   ela, poderia consultar a API do Supabase diretamente, sem passar pelo
   `proxy.ts`, e ler o que aquele papel lê. Correção: políticas restritivas
   que exigem `aal2`.
2. **O aceite dos termos não é conferido no `proxy.ts`.** A página de aceite
   aparece, mas algumas rotas carregam antes dela. Correção: conferir a versão
   aceita no proxy.
3. **O professor lê a agenda inteira.** A política de leitura restringe aluno e
   TI, mas não o professor. Correção: professor vê as próprias reservas, as das
   turmas em que leciona e as palestras.
4. **O limite de tentativas de senha vale para o servidor, não para a
   pessoa.** O login passa pela Server Action, então o Supabase vê o IP da
   Vercel. Um ataque por tentativa e erro não é barrado por IP; o que o contém
   é o segundo fator (que tem limite próprio) e o registro de `login_failed`
   na auditoria. Correção possível: repassar o IP do usuário no cabeçalho
   `Sb-Forwarded-For`.
5. **O cookie de sessão não é `HttpOnly`.** O cliente do navegador precisa
   ler a sessão para o Realtime e para o cadastro do segundo fator, então o
   `@supabase/ssr` não permite marcá-lo assim. Desde 12/11 ele é `Secure` em
   produção, e o HSTS já impedia o envio por HTTP.
6. **Desenvolvimento, testes e produção usam o mesmo banco.** Os testes de
   ponta a ponta criam e apagam dados marcados com `[e2e]` no banco do site
   publicado. É decisão registrada em `docs/publicacao-na-vercel.md`, assumida
   por ser protótipo; numa implantação real seriam projetos separados.
7. **Sem cópia de segurança automática.** O plano gratuito do Supabase não faz
   backup diário; a própria documentação recomenda exportar com
   `supabase db dump`. O que existe hoje é o esquema completo no repositório
   (`supabase/migrations/`), que recria a estrutura, mas não os dados.
   Correção possível: um `db dump` antes de cada entrega, guardado fora do
   repositório, porque contém dados pessoais.
