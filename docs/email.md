# E-mail do CheckRoom

Todo e-mail sai do domínio `checkroom.com.br`, verificado no Resend (região
São Paulo), com o remetente `CheckRoom <nao-responda@checkroom.com.br>`.

| Mensagem | Quem envia | Onde se configura |
|---|---|---|
| Nova reserva e reserva cancelada | A aplicação, pela API do Resend | `RESEND_API_KEY` e `RESEND_FROM` no `.env.local` e na Vercel |
| Recuperação de senha | O Supabase Auth, pelo SMTP do Resend | Painel do Supabase, passo a passo abaixo |
| Convite de usuário | O Supabase Auth, pelo SMTP do Resend | Painel do Supabase, template **Invite user** |

## Proteções no código

- `src/lib/email/destinatario.ts` recusa domínios fictícios (`exemplo.edu.br`,
  `example.com`) e reservados (`.invalid`, `.test`). Enviar para eles gera
  devolução, e devoluções seguidas derrubam a reputação do domínio.
- Reservas cuja finalidade começa com `[e2e]` não notificam: é o prefixo das
  reservas criadas pela suíte de testes.
- Os professores de demonstração recebem no endereço de `SEED_DEMO_EMAIL`:
  Ana no endereço puro, Carlos e Marina com `+carlos` e `+marina`. Quem aplica
  é `npm run seed:usuarios`.

## Recuperação de senha pelo Resend (SMTP no Supabase)

Sem isto, o Supabase usa o servidor de e-mail dele, limitado a poucos envios
por hora e com remetente do Supabase.

1. No Resend, em **API Keys**, crie uma chave com permissão **Sending access**,
   restrita ao domínio `checkroom.com.br`. Use uma chave separada da aplicação:
   revogar uma não derruba a outra.
2. No Supabase, projeto `kalzmyjwqpphwxsmngbf`, abra **Authentication > Emails
   > SMTP Settings** e ative **Enable custom SMTP**:
   - Sender email: `nao-responda@checkroom.com.br`
   - Sender name: `CheckRoom`
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: a chave criada no passo 1
3. Em **Authentication > Emails > Templates**, abra **Reset Password** e troque
   para português:
   - Subject: `Redefina sua senha do CheckRoom`
   - Body:
     ```html
     <h2>Redefinição de senha</h2>
     <p>Recebemos um pedido para redefinir a senha da sua conta no CheckRoom.</p>
     <p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Criar uma nova senha</a></p>
     <p>Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>
     ```
   Faça o mesmo no template **Invite user**, com `type=invite`:
   - Subject: `Você foi convidado para o CheckRoom`
   - Body:
     ```html
     <h2>Boas-vindas ao CheckRoom</h2>
     <p>Você foi convidado a usar o CheckRoom, o sistema de reservas de espaços acadêmicos.</p>
     <p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=invite">Criar minha senha</a></p>
     <p>O link vale por 24 horas. Depois de criar a senha, você cadastra o aplicativo autenticador no primeiro acesso.</p>
     ```

   O link usa `{{ .RedirectTo }}` com o `token_hash`, e não `{{ .ConfirmationURL }}`:
   o link padrão só funciona no mesmo navegador em que a recuperação foi pedida,
   e abrir o e-mail pelo celular falharia.
4. Em **Authentication > URL Configuration > Redirect URLs**, inclua
   `http://localhost:3000/**` (e o endereço da Vercel quando publicar). Sem isso,
   o Supabase ignora o destino pedido pela aplicação e o link quebra.
5. Em **Authentication > Rate Limits**, o limite de e-mails por hora pode subir
   depois do SMTP próprio. 30 por hora sobra para o projeto.
6. Teste em `/recuperar-senha` com o seu próprio e-mail.

As contas de login com e-mail fictício (`marina.prado@exemplo.edu.br`,
`coordenacao@exemplo.edu.br`, `dev.*`) não recebem recuperação: esse envio sai
pelo Supabase, fora da proteção do código. Não peça recuperação para elas.
