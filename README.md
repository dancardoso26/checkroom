# CheckRoom

Sistema web de gestão de espaços e eventos acadêmicos, desenvolvido como Projeto
Final de Curso em Sistemas de Informação.

Esta entrega implementa a **primeira regra de negócio**: a criação de uma
reserva, com verificação de conflito e de compatibilidade, em back-end,
front-end e banco de dados.

## A regra de negócio

Um pedido de reserva amarra um **espaço**, um **professor** e uma **turma** a um
intervalo de tempo. Ele é recusado quando:

| Verificação | Recusa quando |
|---|---|
| Conflito de espaço | a sala já tem outra reserva no horário |
| Conflito de professor | o professor já tem compromisso no horário, **mesmo em outra sala** |
| Conflito de turma | a turma já tem aula no horário, **mesmo em outra sala** |
| Capacidade | a turma tem mais alunos do que o espaço comporta |
| Recursos | a atividade exige um equipamento que o espaço não oferece |
| **Vínculo acadêmico** | **a atividade é aula e o professor não leciona aquela disciplina para aquela turma no período letivo** |
| Expediente | o período cai fora do horário de funcionamento (7h às 22h) |

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

## Cancelamento

A reserva não é apagada: ela passa a **cancelada**, com data e motivo. O registro
de que existiu é o que sustenta a entrega de registros de auditoria, porque
"quem cancelou a aula de sexta, quando e por quê" precisa ter resposta.

Isso exigiu um cuidado nas constraints de exclusão. A linha cancelada continua na
tabela, e sem a cláusula `where (status = 'active')` ela seguiria bloqueando o
horário: cancelar não liberaria a sala, o oposto do objetivo. Há um teste de
ponta a ponta que reserva o horário recém-liberado justamente para provar que a
cláusula está lá.

Cancelar é uma função no banco, e não um `update` pela API: ela garante que as
três colunas mudem juntas, trava a linha contra cancelamentos simultâneos e
recusa cancelar o que já terminou.

## Como a regra é verificada, em três camadas

1. **Zod**, na Server Action. Verificação de *forma*: o campo veio, tem o
   formato certo. Recusa entrada inválida antes de qualquer consulta.
2. **`validateBooking`**, no domínio. Verificação de *regra*: a reserva é
   possível. É uma função pura, sem banco e sem relógio.
3. **Constraints de exclusão do PostgreSQL**. Garantia de *integridade*. É a
   única camada que sobrevive a duas requisições simultâneas, porque é avaliada
   dentro da transação da gravação.

Nenhuma substitui a outra. A primeira não sabe nada do mundo, a segunda trabalha
com uma fotografia dele, e a terceira é a única dentro da transação.

## Tecnologias

| Camada | Escolha |
|---|---|
| Interface | Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui |
| Aplicação | TypeScript em modo strict, Server Actions, Zod |
| Dados | Supabase (PostgreSQL), com tipos gerados a partir do esquema real |
| Testes | Vitest para o domínio, Playwright para ponta a ponta |

## Como executar

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev
```

O banco precisa ser criado antes. As instruções, na ordem de aplicação, estão em
[`supabase/README.md`](supabase/README.md).

## Verificação

```bash
npm run verify   # typecheck, lint, testes unitários e de ponta a ponta
```

Ou separadamente:

| Comando | O que faz |
|---|---|
| `npm run typecheck` | Compilador do TypeScript, sem emitir arquivos |
| `npm run lint` | ESLint com as regras do Next |
| `npm run test` | Testes unitários do domínio |
| `npm run test:coverage` | Cobertura, com mínimo de 50% exigido |
| `npm run test:e2e` | Fluxo completo no navegador e constraints do banco |

Os testes de ponta a ponta precisam do banco populado com `supabase/seed.sql`,
porque verificam conflitos contra as reservas de exemplo.

## Organização do código

```
src/
  domain/booking/     a regra de negócio, sem I/O e sem framework
  lib/repositories/   tradução entre as linhas do banco e o domínio
  lib/supabase/       cliente restrito ao servidor e tipos gerados
  app/reservas/       telas e Server Actions
supabase/migrations/  o esquema do banco, versionado
tests/e2e/            navegador e banco reais
```

A separação entre `domain` e o restante é o ponto central. `validateBooking` não
importa o Supabase, não lê o relógio e não conhece HTTP: recebe o pedido e um
contexto já carregado. É isso que permite testá-la sem infraestrutura e
reaproveitá-la sem duplicação em uma futura API pública.

## O que esta entrega ainda não faz

Registrado aqui de propósito, porque são decisões de escopo e não omissões.

**Autenticação e autorização.** A entrega seguinte. Enquanto não existem, o
acesso ao banco usa a chave secreta dentro das Server Actions, o que ignora as
políticas de Row Level Security. As políticas estão preparadas no banco, mas sem
`auth.uid()` não há como escrevê-las.

Isso pesa mais no cancelamento do que na criação: hoje qualquer visitante pode
cancelar a reserva de qualquer professor. **O sistema não deve ser publicado
neste estado.**

**Calendário acadêmico.** O período letivo existe como rótulo no vínculo
docente (`2026.2`), mas não como calendário com datas de início, fim, recesso e
feriados. Por isso o sistema ainda não recusa uma reserva marcada em pleno
recesso. Quando o calendário entrar, o período passa a ser deduzido da data da
reserva em vez de fixado em constante, e a estrutura já prevê essa troca.
