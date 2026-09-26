# Integração com API externa: Resend

Documentação técnica da integração do CheckRoom com o **Resend**, serviço de
envio de e-mail transacional. Atende ao requisito "integração com API externa"
da entrega de 28/09/2026.

A configuração operacional (painel do Supabase, templates e SMTP) está em
[email.md](email.md). Este documento descreve a integração em si.

## 1. Visão geral

| Item | Valor |
|---|---|
| Serviço | Resend, [resend.com](https://resend.com) |
| Tipo de API | REST, sobre HTTPS, com corpo JSON |
| Endpoint consumido | `POST https://api.resend.com/emails` |
| Autenticação | Chave de API no cabeçalho `Authorization: Bearer <chave>` |
| Cliente | SDK oficial `resend` (v6), que encapsula a chamada REST |
| Conteúdo das mensagens | Componentes React renderizados em HTML por `@react-email/components` |
| Domínio remetente | `checkroom.com.br`, verificado no Resend (SPF e DKIM), região São Paulo |
| Remetente | `CheckRoom <nao-responda@checkroom.com.br>` |

### Por que uma API de e-mail

Uma reserva afeta alguém que nem sempre é quem a registrou: a administração
reserva em nome do professor, e um cancelamento libera a sala que ele contava
usar. Sem aviso, o professor só descobriria a mudança ao abrir a agenda, ou ao
chegar à sala. O e-mail leva a informação até ele no momento em que ela muda.

O Resend foi escolhido por ter SDK oficial em TypeScript, suporte nativo a
modelos escritos em React (o mesmo modelo de componentes da interface) e cota
gratuita suficiente para o projeto.

## 2. Fluxos que usam a integração

| Evento | Quem recebe | Quem envia |
|---|---|---|
| Reserva criada | Professor responsável pela reserva | Aplicação, pela API REST |
| Reserva cancelada, com o motivo | Professor responsável pela reserva | Aplicação, pela API REST |
| Convite de novo usuário | A pessoa convidada | Supabase Auth, pelo SMTP do Resend |
| Recuperação de senha | O dono da conta | Supabase Auth, pelo SMTP do Resend |

Os dois primeiros são a integração programada pela aplicação, detalhada abaixo.
Os dois últimos usam o mesmo serviço e o mesmo domínio, mas quem dispara é o
Supabase Auth, configurado para entregar pelo SMTP do Resend.

## 3. Arquitetura

```
Tela (painel de reserva ou diálogo de cancelamento)
  │  Server Action
  ▼
criarReserva / cancelarReserva          src/app/(sistema)/reservas/actions.ts, cancelar.ts
  │  1. valida a entrada e a permissão
  │  2. grava no banco (a reserva já existe antes do e-mail)
  ▼
notificarProfessor                      src/app/(sistema)/reservas/actions.ts
  │  busca os dados da mensagem com a chave de serviço
  ▼
findBookingNotificationData             src/lib/repositories/bookingRepository.ts
  ▼
avisarSobreReserva                      src/lib/email/enviar.tsx
  │  confere a chave, o destinatário e monta a mensagem
  ▼
EmailDeReserva                          src/lib/email/template.tsx
  ▼
resend.emails.send(...)  ──HTTPS──▶  POST https://api.resend.com/emails
```

O envio acontece **depois** de a reserva estar gravada, e só no servidor. O
navegador nunca fala com o Resend e nunca vê a chave.

## 4. Contrato da chamada

### Pedido

O SDK envia um `POST` para `https://api.resend.com/emails` com:

```http
Authorization: Bearer re_************************
Content-Type: application/json
```

```json
{
  "from": "CheckRoom <nao-responda@checkroom.com.br>",
  "to": "professor@instituicao.edu.br",
  "subject": "Nova reserva: Aula de Engenharia de Software",
  "html": "<html>... gerado a partir de EmailDeReserva ...</html>"
}
```

No código, o corpo HTML não é escrito à mão: o SDK recebe o componente React
(`react: <EmailDeReserva ... />`) e o converte.

### Dados da mensagem

`DadosDaReserva`, em `src/lib/email/template.tsx`:

| Campo | Exemplo |
|---|---|
| `professorNome` | Ana Beatriz Moura |
| `finalidade` | Aula de Engenharia de Software |
| `espaco` | Bloco A · 101 |
| `periodo` | 28/09, 19:00 às 20:40 |
| `turma` | SI 8º semestre A |
| `registradoPor` | Nome de quem criou ou cancelou |
| `motivo` | Só no cancelamento: o motivo informado |

O assunto é `Nova reserva: <finalidade>` ou `Reserva cancelada: <finalidade>`.

### Resposta

| Situação | Resposta do Resend | Tratamento no CheckRoom |
|---|---|---|
| Aceito | `200`, com o `id` da mensagem | Nenhum: a mensagem segue para entrega |
| Dados inválidos (ex.: remetente vazio) | `422 validation_error` | Registrado no log do servidor |
| Chave inválida | `401` | Registrado no log do servidor |
| Limite excedido | `429` | Registrado no log do servidor |
| Serviço indisponível ou falha de rede | Exceção do SDK | Capturada e registrada no log |

## 5. Tolerância a falhas

**O e-mail é consequência da reserva, nunca condição para ela.** Por isso:

- A reserva é gravada antes da chamada. Se o Resend falhar, ela continua válida
  e aparece na agenda.
- `avisarSobreReserva` captura qualquer erro e nunca o propaga para a tela.
- Sem `RESEND_API_KEY` configurada, o sistema funciona normalmente e apenas não
  envia avisos.
- Um remetente vazio no ambiente cai no padrão, em vez de mandar `from: ""` e
  ser recusado com 422 (`src/lib/email/remetente.ts`).

## 6. Segurança e LGPD

- **Chave de API** só no servidor: variável de ambiente `RESEND_API_KEY`, lida
  por um módulo `server-only`, fora do código e do git.
- **Transporte** sempre por HTTPS.
- **Domínio verificado** com SPF e DKIM: os provedores confirmam que a mensagem
  saiu mesmo do CheckRoom, o que reduz a chance de cair no spam e impede que
  outro serviço se passe pelo domínio.
- **Destinatários fictícios bloqueados**: `src/lib/email/destinatario.ts`
  recusa domínios de exemplo (`exemplo.edu.br`, `example.com`) e terminações
  reservadas (`.invalid`, `.test`). Enviar para eles gera devoluções, que
  derrubam a reputação do domínio. Também cobre as contas anonimizadas, cujo
  e-mail vira `@checkroom.invalid`.
- **Reservas de teste não notificam**: finalidades com o prefixo `[e2e]`, usado
  pela suíte de testes, não disparam envio.
- **Minimização de dados**: o Resend recebe só o endereço do destinatário e o
  conteúdo da mensagem. O e-mail do professor não é legível pelos demais
  usuários do sistema; ele é lido pelo servidor apenas para o envio.
- **Transparência**: a política de privacidade (`/privacidade`, seção 3)
  informa o Resend como operador, o que ele recebe e a região de envio.

## 7. Configuração

| Variável | Onde | Uso |
|---|---|---|
| `RESEND_API_KEY` | `.env.local` e Vercel | Autentica as chamadas à API |
| `RESEND_FROM` | `.env.local` e Vercel | Remetente das notificações |
| `SITE_URL` | `.env.local` e Vercel | Endereço usado nos links dos e-mails do Supabase |

## 8. Testes

| Tipo | O que cobre | Onde |
|---|---|---|
| Unitário | Remetente vazio cai no padrão | `src/lib/email/remetente.test.ts` |
| Unitário | Destinatários fictícios e reservados são recusados | `src/lib/email/destinatario.test.ts` |
| Ponta a ponta | Criar, cancelar e excluir reserva sem quebrar quando o e-mail é pulado | `tests/e2e/criar-reserva.spec.ts`, `cancelar-reserva.spec.ts` |
| Manual | Reserva criada pelo sistema para a professora Ana, com entrega confirmada no painel do Resend (`delivered`), remetente `nao-responda@checkroom.com.br` | Registro de 25/09/2026 |

## 9. Limites conhecidos

- Um único endpoint consumido (`/emails`). Relatórios de entrega e devolução
  (webhooks do Resend) não são tratados.
- Não há reenvio automático: uma falha no envio fica registrada no log, e o
  aviso daquela reserva não é repetido.
- A cota gratuita do Resend limita o volume diário, suficiente para o projeto.
