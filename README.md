# CheckRoom

Sistema web de gestão de espaços e eventos acadêmicos, desenvolvido como Projeto
Final de Curso em Sistemas de Informação.

O sistema reserva salas, laboratórios e auditórios verificando conflito de
espaço, de professor e de turma, capacidade, recursos e vínculo docente. O acesso
exige login com segundo fator, a autorização é aplicada na aplicação e no banco,
e toda alteração em reserva entra numa trilha de auditoria.

## A agenda

A tela inicial é um calendário, seguindo a sugestão da validação de 18/09 de que
"tudo acontece a partir dele". Há três visões do mesmo período (calendário,
lista e tabela) e três escalas (dia, semana e mês), guardadas na URL para que
recarregar a página ou compartilhar o link mantenha o que está na tela.

Clicar num horário vago abre um painel lateral com a data e o horário já
preenchidos. A reserva é feita ali, numa tela só: atividade, horário,
necessidades e espaço, com a lista de salas compatíveis aparecendo conforme os
campos são preenchidos. Clicar numa reserva existente mostra os detalhes e as
ações de cancelar e excluir.

Atalhos: `D` dia, `S` semana, `M` mês, `←` e `→` para navegar, `H` hoje, `N` nova
reserva. Não valem enquanto o foco está num campo de texto.

A regra de negócio não mudou com a nova jornada: o painel chama as mesmas
funções que o formulário anterior chamava.

## A regra de negócio

Um pedido de reserva amarra um **espaço**, um **professor** e uma **turma** a um
intervalo de tempo. Ele é recusado quando:

| Verificação           | Recusa quando                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| Conflito de espaço    | a sala já tem outra reserva no horário                                                                 |
| Conflito de professor | o professor já tem compromisso no horário, **mesmo em outra sala**                                     |
| Conflito de turma     | a turma já tem aula no horário, **mesmo em outra sala**                                                |
| Capacidade            | a turma tem mais alunos do que o espaço comporta                                                       |
| Recursos              | a atividade exige um equipamento que o espaço não oferece                                              |
| **Vínculo acadêmico** | **a atividade é aula e o professor não leciona aquela disciplina para aquela turma no período letivo** |
| Expediente            | o período cai fora do horário de funcionamento (7h às 22h)                                             |

Os conflitos de professor e de turma são o que diferencia o CheckRoom de uma
agenda genérica de salas: não adianta a sala estar livre se a professora está
dando aula em outro bloco.

O vínculo acadêmico vai além disso. Ele é o que torna o modelo **exclusivo de
educação**, e não transportável para qualquer área: uma agenda de consultórios
ou de coworking não tem onde encaixar a relação entre docente, disciplina e
turma. Uma reserva com todos os horários livres e o espaço perfeito continua
sendo recusada se aquele professor não leciona aquela disciplina para aquela
turma.

Toda reserva declara um **tipo de atividade**: aula, palestra, prova, defesa ou
evento. Só a aula exige disciplina e vínculo docente, porque só ela pertence a
uma disciplina.

Essa declaração não é enfeite. Antes dela a disciplina era simplesmente
opcional, para acomodar defesa de TCC e seminário, e bastava deixar o campo
vazio para escapar da verificação do vínculo. Com o tipo declarado, a exigência
deixa de depender de o usuário não preencher um campo.

O formulário também oferece apenas o que é possível: escolhido o professor, a
lista de turmas mostra só aquelas para as quais ele leciona, e a de disciplinas
só as que ele leciona para aquela turma. A combinação impossível deixa de
existir em vez de ser recusada depois.

O intervalo é fechado no início e aberto no fim. Uma aula que termina às 20h40 e
outra que começa às 20h40 **não** conflitam, que é o caso normal de uma grade
horária encadeada.

## Cancelar e excluir

São operações diferentes, e a interface deixa isso explícito:

|              | Significado                   | O registro                    |
| ------------ | ----------------------------- | ----------------------------- |
| **Cancelar** | a atividade não vai acontecer | preservado, com data e motivo |
| **Excluir**  | a reserva não deveria existir | apagado do banco              |

Cancelar é fato acadêmico e sustenta a entrega de registros de auditoria, porque
"quem cancelou a aula de sexta, quando e por quê" precisa ter resposta. Excluir é
correção de erro: engano de digitação, duplicata, dado de teste. A confirmação de
exclusão sugere cancelar a quem só quer desmarcar a aula.

Reservas canceladas somem da agenda, mas continuam alcançáveis pelo filtro "Ver
canceladas" da listagem. Sem ele, o histórico existiria só no banco e a reserva
cancelada nunca poderia ser excluída.

Excluir apaga também os recursos vinculados, pelo `on delete cascade` de
`booking_resources`. Não há registro de quem excluiu, e não haveria como: a linha
que o guardaria é justamente a que se apaga. Quando os logs de auditoria
existirem como tabela própria, a exclusão passa a gravar um evento lá antes de
remover a reserva.

Isso exigiu um cuidado nas constraints de exclusão. A linha cancelada continua na
tabela, e sem a cláusula `where (status = 'active')` ela seguiria bloqueando o
horário: cancelar não liberaria a sala, o oposto do objetivo. Há um teste de
ponta a ponta que reserva o horário recém-liberado justamente para provar que a
cláusula está lá.

Cancelar é uma função no banco, e não um `update` pela API: ela garante que as
três colunas mudem juntas, trava a linha contra cancelamentos simultâneos e
recusa cancelar o que já terminou.

## Como a regra é verificada, em três camadas

1. **Zod**, na Server Action. Verificação de _forma_: o campo veio, tem o
   formato certo. Recusa entrada inválida antes de qualquer consulta.
2. **`validateBooking`**, no domínio. Verificação de _regra_: a reserva é
   possível. É uma função pura, sem banco e sem relógio.
3. **Constraints de exclusão do PostgreSQL**. Garantia de _integridade_. É a
   única camada que sobrevive a duas requisições simultâneas, porque é avaliada
   dentro da transação da gravação.

Nenhuma substitui a outra. A primeira não sabe nada do mundo, a segunda trabalha
com uma fotografia dele, e a terceira é a única dentro da transação.

## Segurança

### Autenticação

- Senha, com no mínimo oito caracteres, e **segundo fator TOTP** obrigatório
  (aplicativo autenticador). O middleware confere o nível da sessão (`aal2`)
  em toda requisição, e quem ainda não passou pelo segundo fator só alcança as
  telas de verificação.
- A sessão é validada no servidor de autenticação a cada requisição
  (`getUser`), e não lida de um cookie que o cliente controla.
- Contas novas não se cadastram sozinhas: entram por **convite** do
  administrador. O papel da conta é definido pelo servidor, nunca pelo que o
  cadastro informa.
- Trocar a senha exige ter chegado pelo link do e-mail ou já ter passado pelo
  segundo fator, e encerra todas as sessões da conta.

### Autorização

- Quatro papéis (aluno, professor, equipe de TI e administrador) e um
  **administrador master**, dono do sistema, que não pode ser removido,
  desativado nem rebaixado.
- Duas camadas independentes: as regras em `src/domain/auth/permissoes.ts`, que
  dão a mensagem, e as políticas de **Row Level Security** do PostgreSQL, que
  dão a garantia. Uma ação chamada direto, sem passar pela tela, é recusada
  pelo banco.

### Criptografia

| Onde              | Como                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| Senha             | Nunca guardada em texto: o Supabase Auth guarda só o hash **bcrypt**, com sal por usuário               |
| Em trânsito       | Toda comunicação por **HTTPS/TLS**: navegador, Supabase e Resend. Em produção, HSTS obriga o HTTPS      |
| Em repouso        | Banco e backups criptografados com **AES-256** pelo Supabase (região São Paulo)                         |
| Sessão            | Tokens **JWT assinados** pelo servidor de autenticação, com validade curta e renovação automática       |
| Segundo fator     | Códigos **TOTP** (RFC 6238), derivados por HMAC de um segredo que só existe no servidor e no aplicativo |
| Chaves de serviço | A chave secreta do Supabase e a do Resend ficam só no servidor (`server-only`), fora do código e do git |

### Proteções da aplicação

- Cabeçalhos de segurança em toda resposta (`next.config.ts`): proíbe embutir o
  sistema em outro site, bloqueia _MIME sniffing_, limita o _referrer_ e as
  permissões do navegador.
- Redirecionamentos depois do login e dos links de e-mail só aceitam caminhos
  internos.
- Mensagens de login e de recuperação não revelam se o e-mail tem conta.
- Os links dos e-mails usam um endereço fixo (`SITE_URL`), e não o que a
  requisição informa.
- O e-mail dos professores não é legível pelos demais usuários.

### Auditoria e LGPD

- A trilha registra entradas, saídas, tentativas recusadas, reservas (por
  gatilho no banco) e a gestão de usuários. Ninguém tem permissão de escrever
  nela pela API.
- Excluir uma conta anonimiza o perfil, o cadastro de docente e os e-mails da
  trilha de auditoria. Depois disso, nenhum dado identifica a pessoa.

## Tecnologias

| Camada    | Escolha                                                           |
| --------- | ----------------------------------------------------------------- |
| Interface | Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui     |
| Aplicação | TypeScript em modo strict, Server Actions, Zod                    |
| Dados     | Supabase (PostgreSQL), com tipos gerados a partir do esquema real |
| Testes    | Vitest para o domínio, Playwright para ponta a ponta              |

## Como executar

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev
```

O banco precisa ser criado antes. As instruções, na ordem de aplicação, estão em
[`supabase/README.md`](supabase/README.md).

### Contas

`npm run seed:usuarios` cria três grupos de contas, todos com a senha de
`SEED_USER_PASSWORD`:

| Grupo           | Contas                                                                                              | Segundo fator                          |
| --------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Demonstração    | `coordenacao@exemplo.edu.br`, a da Ana (e-mail de `SEED_DEMO_EMAIL`), `marina.prado@exemplo.edu.br` | Exigido                                |
| Desenvolvimento | `dev.admin@exemplo.edu.br`, `dev.professor@exemplo.edu.br`                                          | Dispensado fora de produção            |
| Teste do TOTP   | `teste.mfa@exemplo.edu.br`                                                                          | Exigido, e apagado antes de cada suíte |

As de desenvolvimento servem para entrar rápido enquanto se programa, e são as
que os testes usam. A dispensa vem da variável `MFA_DISPENSADO_PARA` e o código a
ignora quando `NODE_ENV` é `production`, então nenhuma configuração esquecida
abre essa porta num ambiente publicado. Um aviso no cabeçalho identifica a conta,
para que ela não apareça por engano numa demonstração.

Rodar o script de novo apaga todas as contas e seus segundos fatores: quem já
tinha cadastrado o autenticador numa conta de demonstração precisa cadastrar de
novo. Os testes nunca tocam nessas contas.

Os e-mails saem de `checkroom.com.br` pelo Resend. Configuração, proteções
contra envio para endereços fictícios e o SMTP da recuperação de senha estão
em [docs/email.md](docs/email.md). A documentação técnica da integração com
a API do Resend está em [docs/integracao-api-externa.md](docs/integracao-api-externa.md).

## Verificação

```bash
npm run verify   # typecheck, lint, testes unitários e de ponta a ponta
```

Ou separadamente:

| Comando                 | O que faz                                          |
| ----------------------- | -------------------------------------------------- |
| `npm run typecheck`     | Compilador do TypeScript, sem emitir arquivos      |
| `npm run lint`          | ESLint com as regras do Next                       |
| `npm run test`          | Testes unitários do domínio                        |
| `npm run test:coverage` | Cobertura, com mínimo de 50% exigido               |
| `npm run test:e2e`      | Fluxo completo no navegador e constraints do banco |

Os testes de ponta a ponta precisam do banco populado com `supabase/seed.sql`,
porque verificam conflitos contra as reservas de exemplo.

Eles sobem o servidor na porta **3100**, e não na 3000, para não esbarrar em
outro projeto. Se você já tem um `npm run dev` aberto, informe a porta dele em
vez de encerrá-lo:

```bash
CHECKROOM_PORT=3002 npm run test:e2e
```

## Organização do código

```
src/
  domain/booking/          a regra de negócio, sem I/O e sem framework
  domain/auth/             quem pode fazer o quê, como função pura
  lib/calendario.ts        aritmética de dias, semanas e meses, e a grade
  lib/repositories/        tradução entre as linhas do banco e o domínio
  lib/supabase/            clientes do servidor e do navegador, e tipos gerados
  app/reservas/agenda/     calendário, lista, tabela e detalhe
  app/reservas/formulario/ o painel de nova reserva e suas seções
  app/reservas/            a página e as Server Actions
supabase/migrations/  o esquema do banco, versionado
tests/e2e/            navegador e banco reais
```

A separação entre `domain` e o restante é o ponto central. `validateBooking` não
importa o Supabase, não lê o relógio e não conhece HTTP: recebe o pedido e um
contexto já carregado. É isso que permite testá-la sem infraestrutura e
reaproveitá-la sem duplicação em uma futura API pública.

## O que esta entrega ainda não faz

Registrado aqui de propósito, porque são decisões de escopo e não omissões.

**Calendário acadêmico.** O período letivo existe como rótulo no vínculo
docente (`2026.2`), mas não como calendário com datas de início, fim, recesso e
feriados. Por isso o sistema ainda não recusa uma reserva marcada em pleno
recesso. Quando o calendário entrar, o período passa a ser deduzido da data da
reserva em vez de fixado em constante, e a estrutura já prevê essa troca.
