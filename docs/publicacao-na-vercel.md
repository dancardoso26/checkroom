# Publicação do CheckRoom na Vercel

Passo a passo para colocar o app no ar usando o **mesmo projeto Supabase** que já
está configurado (banco, Auth e SMTP do Resend). Só o site passa a ter um
endereço público. O build de produção (`next build`) foi testado em 06/11 e
passa.

## Situação atual (06/11/2026)

O site está publicado em [https://checkroom.com.br](https://checkroom.com.br)
(o endereço `checkroom-alpha.vercel.app` continua válido). Cada merge na `main`
publica sozinho. O projeto da Vercel fica na conta ligada ao GitHub
`dancardoso26`, dono do repositório: no plano Hobby, o deploy automático exige
que o importador seja o dono, e um colaborador não consegue importar.

| Item | Estado |
|---|---|
| Produção | `main`, com deploy automático |
| Região das funções | São Paulo (`gru1`), a mesma do Supabase. Com a padrão (`iad1`, EUA), cada consulta atravessava o continente e a agenda demorava a trocar de semana |
| Domínio | `checkroom.com.br` na Vercel; o `www` redireciona (308) para o domínio sem `www` |
| DNS (Hostinger) | `A` do `@` em `76.76.21.21` e `CNAME` do `www` em `cname.vercel-dns.com`, TTL 300 |
| E-mail | Registros do Resend (`resend._domainkey`, `send`, `rsend`) intactos |
| Supabase | Site URL e Redirect URLs com `https://checkroom.com.br`; o `localhost` e o `vercel.app` ficam na lista |
| `SITE_URL` | `https://checkroom.com.br` |

Se o navegador ainda abrir a página de domínio estacionado da Hostinger depois
de uma troca de DNS, é cache local do IP antigo: limpe em
`chrome://net-internals/#dns` ou rode `ipconfig /flushdns` como administrador.

## 0. Decisões antes de começar

| Decisão | Escolha |
|---|---|
| Banco | O mesmo projeto Supabase do desenvolvimento |
| Branch de produção | `main`. O que está na `main` é o que vai ao ar, então o trabalho da `entrega0911` entra por pull request (`CLAUDE.md`: nada é commitado direto na `main`) |
| Plano | Hobby (gratuito) |
| Domínio | `checkroom.com.br`, o mesmo do remetente dos e-mails |

### O que muda por usar o mesmo banco

- **Dados de teste ao vivo.** Os e2e (`npm run test:e2e`) inserem reservas com
  prefixo `[e2e]` e apagam a conta `teste.mfa@exemplo.edu.br`. Com o site
  público, quem usar o sistema enquanto a suíte roda vê esses registros. Rode a
  suíte só quando ninguém estiver usando, ou evite nos dias de demonstração.
- **Nunca rodar de novo `npm run seed:usuarios` nem o `seed.sql`.** Os dois
  apagam as contas e as tabelas. Com o sistema no ar, isso derruba o acesso de
  todo mundo.
- **Segundo fator.** Em produção o código ignora `MFA_DISPENSADO_PARA`. As
  contas de uso diário (`adm@umc.br`, `professor@umc.br`, `aluno@umc.br`,
  `suporte@umc.br`) hoje entram sem autenticador só no seu computador; no site
  publicado cada uma vai pedir o cadastro do autenticador (TOTP) no primeiro
  acesso. Faça isso uma vez por conta antes da demonstração.
- **Migrations.** O banco já tem todas; não é preciso aplicar nada.

## 1. Pré-requisitos no repositório

1. Tudo o que deve ir ao ar precisa estar **commitado e enviado** ao GitHub
   (`dancardoso26/checkroom`) e mesclado na `main` por pull request. O commit e
   o push só acontecem quando você pedir.
2. Confirme que `.env.local` não está versionado (já coberto pelo `.gitignore`).
3. Rode localmente, antes de publicar:

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm run build
```

## 2. Reunir os valores que já existem

No seu `.env.local` estão os valores que a Vercel vai receber:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`, `RESEND_API_KEY` e `RESEND_FROM`. Se preferir, confira no
painel do Supabase em **Project Settings > API Keys** e no Resend em **API
Keys**.

## 3. Criar o projeto na Vercel

1. Em [vercel.com/new](https://vercel.com/new), entre com o GitHub e importe
   `dancardoso26/checkroom`.
2. **Framework Preset:** Next.js (detectado). Build e install padrão. **Root
   Directory:** a raiz do repositório.
3. **Production Branch:** em **Settings > Git**, escolha a branch decidida no
   passo 0.
4. Opcional, em **Settings > Functions**, defina a região de funções igual à do
   Supabase (por exemplo `gru1`, se o projeto estiver em São Paulo), para reduzir
   a latência. A região do Supabase aparece em **Project Settings > General**.
5. **Não clique em Deploy ainda**: configure as variáveis antes (passo 4), porque
   as `NEXT_PUBLIC_*` são embutidas no build.

## 4. Variáveis de ambiente

Em **Settings > Environment Variables**, para o ambiente **Production**:

| Variável | Valor | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | A mesma do `.env.local` | Embutida no build |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | A mesma do `.env.local` | Embutida no build |
| `SUPABASE_SECRET_KEY` | A mesma do `.env.local` | Marque **Sensitive**. Nunca com prefixo `NEXT_PUBLIC` |
| `RESEND_API_KEY` | A mesma do `.env.local` | Chave de envio da aplicação |
| `RESEND_FROM` | `CheckRoom <nao-responda@checkroom.com.br>` | Domínio verificado no Resend |
| `SITE_URL` | `https://SEU-DOMINIO` sem barra final | Entra nos links de convite e recuperação |

**Não** defina `MFA_DISPENSADO_PARA`, `SEED_USER_PASSWORD` nem
`SEED_DEMO_EMAIL` na Vercel: servem só para desenvolvimento e seed.

O endereço `*.vercel.app` só é conhecido depois do primeiro deploy. Faça o
primeiro deploy com um `SITE_URL` provisório, anote o endereço e atualize no
passo 7 (alterar variável exige novo deploy).

## 5. Primeiro deploy

1. Clique em **Deploy** e acompanhe o log. Se o build falhar, o erro aparece ali;
   o mesmo comando local é `npm run build`.
2. Abra o endereço gerado e confirme que `/login` carrega.

## 6. Liberar o endereço no Supabase

O SMTP do Resend e os templates de e-mail já estão configurados neste projeto
(veja [`docs/email.md`](email.md)). Falta só autorizar o novo endereço:

1. **Authentication > URL Configuration > Redirect URLs:** acrescente
   `https://SEU-DOMINIO/**`. **Mantenha** `http://localhost:3000/**` para o
   desenvolvimento continuar funcionando.
2. **Site URL:** troque para o endereço publicado. O `localhost` segue valendo
   pela lista de Redirect URLs.

Sem isso o Supabase ignora o destino do link e o convite e a recuperação de
senha quebram.

## 7. Fechar o endereço final

1. Atualize `SITE_URL` na Vercel com o endereço real e dispare um **Redeploy**
   (Deployments, menu do último deploy, Redeploy).
2. Domínio próprio: **Settings > Domains > Add**, adicionando o domínio e o
   `www` (marque o `www` para redirecionar ao domínio sem `www`). Depois, no
   DNS, troque só o `A` do `@` e o `CNAME` do `www` pelos valores que a Vercel
   mostrar, e repita o passo anterior e o 6 com o novo endereço. Os registros do
   Resend (e-mail) ficam no mesmo DNS e não conflitam com os da Vercel: não
   apague nem edite nenhum deles. Algumas hospedagens recusam TTL abaixo de 60.

## 8. Teste de fumaça no ar

Faça nesta ordem, com o endereço publicado:

1. Entrar com uma conta de uso diário e cadastrar o autenticador.
2. Abrir a agenda, criar uma reserva e conferir que o e-mail chega ao professor
   (use um professor com e-mail real; endereços `exemplo.edu.br` não recebem).
3. `/recuperar-senha` com um e-mail real: o link do e-mail deve abrir no
   endereço publicado, inclusive pelo celular.
4. Como administrador: convidar um usuário e abrir o `/dashboard`.
5. Abrir um chamado e assumi-lo como TI.
6. Conferir `/termos` e `/privacidade` sem login.
7. Em **Network** do navegador, conferir os cabeçalhos de segurança
   (`Strict-Transport-Security`, `X-Frame-Options`).
8. Apagar as reservas e os chamados criados no teste, se não quiser que
   apareçam na demonstração.

## 9. Depois da publicação

- Cada push na branch de produção publica sozinho. Outras branches geram deploys
  de pré-visualização; limite as variáveis ao ambiente Production para os
  previews não usarem o banco.
- Se uma chave vazar, rotacione no Supabase ou no Resend e atualize a variável
  na Vercel com novo deploy.
- Atualize o README e a monografia com o endereço publicado.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Link de convite ou recuperação leva ao endereço errado | `SITE_URL` desatualizado ou endereço fora das Redirect URLs do Supabase |
| `Invalid API key` ou login falhando | Chaves diferentes das do `.env.local`, ou `NEXT_PUBLIC_*` alteradas sem novo deploy |
| E-mail de reserva não chega | `RESEND_API_KEY` ou `RESEND_FROM` ausentes, ou destinatário com domínio fictício |
| Página pede segundo fator numa conta de uso diário | Esperado: em produção a dispensa é ignorada |
