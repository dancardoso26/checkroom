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
| Expediente | o período cai fora do horário de funcionamento (7h às 22h) |

Os conflitos de professor e de turma são o que diferencia o CheckRoom de uma
agenda genérica de salas: não adianta a sala estar livre se a professora está
dando aula em outro bloco.

O intervalo é fechado no início e aberto no fim. Uma aula que termina às 20h40 e
outra que começa às 20h40 **não** conflitam, que é o caso normal de uma grade
horária encadeada.

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
`auth.uid()` não há como escrevê-las. **O sistema não deve ser publicado neste
estado.**

**Contexto acadêmico completo.** A reserva ainda não representa disciplina,
período letivo, calendário acadêmico nem o vínculo entre professor, turma e
disciplina. Na prática, o sistema hoje aceita qualquer professor reservando para
qualquer turma. É a evolução prevista para a etapa seguinte.
