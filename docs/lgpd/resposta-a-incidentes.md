# Plano de resposta a incidentes

Versão 1.0, de 12/11/2026. Atende ao item 7 da Seção 6 e segue os seis passos
da Seção 4.7 das orientações da disciplina. A Política de Privacidade traz o
resumo, na seção "Incidentes de segurança".

## Quem responde

Enquanto o CheckRoom for protótipo acadêmico, o autor é o controlador e
responde sozinho pelos seis passos. Numa implantação real, a instituição
indicaria um responsável técnico e o encarregado de dados, e este plano
passaria a citar os dois.

Canal para relatos: o endereço publicado na Política de Privacidade.

## O que conta como incidente

Qualquer evento que comprometa a confidencialidade, a integridade ou a
disponibilidade de dados pessoais. Exemplos concretos neste sistema:

- uma chave secreta (`SUPABASE_SECRET_KEY` ou `RESEND_API_KEY`) publicada no
  GitHub, num print ou num log;
- uma conta usada por quem não é o titular;
- uma política de RLS que deixa um papel ler o que não devia;
- um e-mail de aviso enviado ao destinatário errado;
- dados apagados ou alterados sem registro na auditoria.

## 1. Detectar e confirmar

Fontes que mostram um incidente:

| Fonte | O que procurar |
|---|---|
| Log de auditoria (`/configuracoes/auditoria`) | Rajadas de `login_failed` para o mesmo e-mail; `login` em horário incomum; alteração de papel que ninguém pediu |
| Logs do Supabase (Auth e API) | Pedidos com a chave publicável vindos de fora do site; erros 401 e 403 em sequência |
| Logs da Vercel | Erros 5xx em sequência; picos de requisições |
| GitHub | Alerta de segredo exposto (secret scanning) |
| Relato de usuário | Pelo canal da política ou pela administração |

Consulta para rajadas de falha de login, no SQL Editor:

```sql
select after_state ->> 'email' as email_tentado,
       count(*) as falhas,
       min(occurred_at) as primeira,
       max(occurred_at) as ultima
  from public.audit_logs
 where action = 'login_failed'
   and occurred_at > now() - interval '24 hours'
 group by 1
having count(*) >= 5
 order by falhas desc;
```

Confirmar é responder: aconteceu de fato, quando começou e se ainda está
acontecendo. A partir desse momento conta o prazo de comunicação.

## 2. Conter e preservar evidências

Antes de corrigir, guardar o que mostra o incidente: exportar as linhas
relevantes de `audit_logs` e os logs da plataforma do período. A auditoria não
pode ser alterada pela aplicação, então ela é a evidência principal.

Ações de contenção, conforme o caso:

| Situação | Ação |
|---|---|
| Chave secreta exposta | Gerar uma nova no painel do Supabase ou do Resend, trocar a variável na Vercel, publicar de novo e revogar a antiga |
| Conta comprometida | Desativar a conta em Configurações, Usuários, o que a bloqueia no Supabase Auth; depois, com o titular, trocar a senha e cadastrar de novo o autenticador |
| Política de RLS com falha | Migration corrigindo a política, aplicada assim que confirmada |
| Envio de e-mail errado | Suspender o envio retirando a `RESEND_API_KEY` da Vercel até a correção |
| Comprometimento amplo | Pausar o projeto no Supabase, o que tira o sistema do ar |

## 3. Identificar dados e titulares afetados

Pela auditoria e pelas políticas: quais tabelas o acesso alcançou e de quais
pessoas. O [inventário](inventario-de-tratamento.md) diz o que cada tabela
guarda, e a [matriz de perfis](matriz-de-perfis.md), o que cada papel lê.

## 4. Avaliar o risco

O CheckRoom não trata dados sensíveis (LGPD, art. 5º, II), nem dados
financeiros, de crianças ou de documentos. O risco de um vazamento é,
principalmente, de exposição de nome, e-mail institucional e rotina de aulas.
Fica mais alto quando:

- envolve senhas ou segredos de segundo fator, o que permitiria usar a conta;
- atinge muitos titulares;
- os dados ficaram públicos, e não só acessíveis a um usuário autenticado.

## 5. Comunicar

Quando o incidente puder causar risco ou dano relevante, a LGPD (art. 48) exige
comunicar a ANPD e os titulares. O regulamento da ANPD (Resolução CD/ANPD nº
15, de 2024) fixa o prazo de três dias úteis a partir do conhecimento, e o
agente de pequeno porte tem prazo em dobro (Resolução CD/ANPD nº 2, de 2022).

A comunicação aos titulares sai pelo próprio sistema de e-mail e diz, em
linguagem simples: o que aconteceu, quais dados foram atingidos, o que já foi
feito e o que a pessoa deve fazer (por exemplo, trocar a senha e cadastrar de
novo o autenticador).

## 6. Corrigir e registrar

Corrigir a causa, acompanhar se o problema não volta e registrar o incidente,
mesmo os que não precisaram ser comunicados. O regulamento da ANPD pede que o
registro seja guardado por pelo menos cinco anos. Cada registro traz: data do
conhecimento, descrição, dados e titulares afetados, avaliação de risco, se
houve comunicação e as medidas tomadas.

Os registros não ficam no repositório, porque podem conter dados pessoais.

## Exercício simulado

Para conferir que o plano funciona sem esperar um incidente real, o passo 2
pode ser ensaiado com a desativação de uma conta de demonstração: desativar,
confirmar que o login é recusado e que o evento `user_deactivated` aparece na
auditoria, e reativar. Esse caminho ainda não tem teste automatizado; vale
fazê-lo à mão antes da banca e anotar a data aqui.
