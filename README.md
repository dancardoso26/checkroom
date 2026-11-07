# CheckRoom

Sistema web de gestão de espaços e eventos acadêmicos, desenvolvido como Projeto
Final de Curso em Sistemas de Informação.

O sistema reserva salas, laboratórios e auditórios verificando conflito de
espaço, de professor e de turma, capacidade, recursos, vínculo de professor e o
calendário letivo. Além das reservas, atende chamados de suporte sobre os
espaços, palestras com inscrição dos alunos e um painel de métricas para a
administração. O acesso exige login com segundo fator, a autorização é aplicada
na aplicação e no banco, e toda alteração entra numa trilha de auditoria.

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

A agenda, as palestras, os chamados e o dashboard se atualizam em tempo real:
quando alguém cria, cancela ou exclui um registro, as outras telas abertas
mudam sozinhas, sem recarregar a página. O Supabase Realtime avisa o navegador,
e o navegador refaz a consulta normal, que continua passando pela RLS. Detalhes
em `src/components/atualizacao-ao-vivo.tsx`.

## Módulos

| Módulo        | Quem usa                                   | O que faz                                                                                                                        |
| ------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Reservas      | professor, administração                   | agenda e reserva com as regras abaixo                                                                                            |
| Chamados      | professor e administração abrem; TI atende | aberto, em atendimento, resolvido (com nota) ou cancelado pelo solicitante; quem assumiu pode devolver à fila; pipeline por situação ou tabela; aviso por e-mail na resolução |
| Palestras     | administração cadastra; aluno se inscreve  | curso de destino, espaço livre, vagas até a capacidade; aviso aos alunos dos cursos e ao palestrante; inscrição única, antes do início e com vaga; aviso de cancelamento aos inscritos |
| Painel        | administração                              | ocupação por espaço, chamados por situação e prioridade, inscritos por palestra, num período                                     |
| Configurações | administração                              | usuários, espaços e recursos, cadastro acadêmico e calendário letivo (períodos e bloqueios)                                      |

Cada módulo segue o mesmo caminho da reserva: a Server Action confere sessão e
papel, a regra mora numa função pura em `src/domain/`, e o banco repete a
garantia (RLS, constraints e funções com trava para o que é concorrente, como a
última vaga de uma palestra ou duas pessoas da TI assumindo o mesmo chamado).

A palestra ocupa o espaço como uma reserva: as duas gravações pegam a mesma
trava por espaço no banco, e a palestra aparece na grade da agenda.

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
ou de coworking não tem onde encaixar a relação entre professor, disciplina e
turma. Uma reserva com todos os horários livres e o espaço perfeito continua
sendo recusada se aquele professor não leciona aquela disciplina para aquela
turma.

Toda reserva declara um **tipo de atividade**: aula, palestra, prova ou
evento. Só a aula exige disciplina e vínculo de professor, porque só ela pertence a
uma disciplina.

Essa declaração não é enfeite. Antes dela a disciplina era simplesmente
opcional, para acomodar seminário e palestra, e bastava deixar o campo
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

Nos dois casos o professor da reserva recebe um e-mail: "reserva cancelada", com
o motivo, ou "reserva removida". A remoção só avisa quando a reserva ainda não
aconteceu e estava ativa; apagar um registro antigo ou já cancelado não gera
mensagem. Os dados do aviso são lidos antes de apagar, porque depois a linha não
existe mais.

Reservas canceladas somem da agenda, mas continuam alcançáveis pelo filtro "Ver
canceladas" da listagem. Sem ele, o histórico existiria só no banco e a reserva
cancelada nunca poderia ser excluída.

Excluir apaga também os recursos vinculados, pelo `on delete cascade` de
`booking_resources`. Quem excluiu e o que foi excluído ficam na trilha de
auditoria: o gatilho `bookings_audit` grava o estado anterior da reserva e o
autor da exclusão antes de a linha deixar de existir.

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
  (aplicativo autenticador). O proxy (`src/proxy.ts`) confere o nível da sessão (`aal2`)
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
- Cada papel vê só o que usa: o aluno, as reservas da própria turma; a equipe
  de TI, só os chamados, sem agenda de reservas nem palestras. As duas
  restrições valem também no banco, pelas políticas de leitura.
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
- Excluir uma conta anonimiza o perfil, o cadastro de professor e os e-mails da
  trilha de auditoria. Depois disso, nenhum dado identifica a pessoa.

## Tecnologias

| Camada    | Escolha                                                           |
| --------- | ----------------------------------------------------------------- |
| Interface | Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui     |
| Aplicação | TypeScript em modo strict, Server Actions, Zod                    |
| Dados     | Supabase (PostgreSQL), com tipos gerados a partir do esquema real |
| Testes    | Vitest para o domínio, Playwright para ponta a ponta              |

## Endereço publicado

O sistema está no ar em [https://checkroom.com.br](https://checkroom.com.br),
hospedado na Vercel, com deploy automático a cada merge na `main`. O passo a
passo da publicação, o DNS e as variáveis de ambiente estão em
[`docs/publicacao-na-vercel.md`](docs/publicacao-na-vercel.md).

## Como executar

```bash
npm install
cp .env.example .env.local   # troque cada ${YOUR_...} pelo valor do seu projeto
npm run dev
```

O banco precisa ser criado antes. As instruções, na ordem de aplicação, estão em
[`supabase/README.md`](supabase/README.md).

### Contas

`npm run seed:usuarios` cria as contas de demonstração, todas com a senha de
`SEED_USER_PASSWORD`, e popula o banco com reservas, palestras, inscrições e
chamados fictícios (a base de referência vem do `supabase/seed.sql`, que roda
antes):

| Grupo         | Contas                                                                                                                   | Segundo fator                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| Demonstração  | `coordenacao@exemplo.edu.br`, a da Ana (e-mail de `SEED_DEMO_EMAIL`), `marina.prado@exemplo.edu.br`                      | Exigido                                |
| Uso diário    | `adm@umc.br` (administrador master), `professor@umc.br` (professor), `aluno@umc.br` (aluno de SI), `suporte@umc.br` (TI) | Dispensado fora de produção            |
| Demais contas | Professores, alunos de cada curso e a segunda pessoa de TI, todas em `@exemplo.edu.br`                                   | Exigido                                |
| Teste do TOTP | `teste.mfa@exemplo.edu.br`                                                                                               | Exigido, e apagado antes de cada suíte |

As de uso diário servem para entrar rápido enquanto se programa, e são as que os
testes usam. A dispensa vem da variável `MFA_DISPENSADO_PARA` e o código a
ignora quando `NODE_ENV` é `production`, então nenhuma configuração esquecida
abre essa porta num ambiente publicado. Um aviso no cabeçalho identifica a conta,
para que ela não apareça por engano numa demonstração.

O script também cria um chamado em cada situação e uma palestra com uma
inscrição, para o painel e a fila da TI não começarem vazios.

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
  domain/booking/          a regra da reserva, sem I/O e sem framework
  domain/chamados/         a máquina de estados do chamado
  domain/palestras/        cadastro e inscrição em palestras
  domain/calendario/       períodos letivos e bloqueios
  domain/painel/           as métricas do painel, calculadas sem SQL
  domain/espacos/, academico/  as regras dos cadastros
  domain/auth/             quem pode fazer o quê, como função pura
  domain/agenda/           navegação da agenda (dias, semanas, meses) e filtros
  domain/tabela/           busca, ordenação e paginação das tabelas
  domain/documentos/       versão vigente dos termos e da política
  domain/formulario/       erros por campo, comuns aos formulários
  hooks/                   estado de tabela, pesquisa e ordenação nas telas
  lib/repositories/        tradução entre as linhas do banco e o domínio
  lib/supabase/            clientes do servidor e do navegador, e tipos gerados
  app/reservas/agenda/     calendário, lista, tabela e detalhe
  app/reservas/formulario/ o painel de nova reserva e suas seções
  app/reservas/acoes/      criar, cancelar, excluir e notificar (Server Actions)
  app/reservas/            a página da agenda
supabase/migrations/  o esquema do banco, versionado
tests/e2e/            navegador e banco reais
```

Para achar a regra, a tela e o teste de um requisito (RF08, RN09...), use a
tabela em [docs/rastreabilidade.md](docs/rastreabilidade.md).

A separação entre `domain` e o restante é o ponto central. `validateBooking` não
importa o Supabase, não lê o relógio e não conhece HTTP: recebe o pedido e um
contexto já carregado. É isso que permite testá-la sem infraestrutura e
reaproveitá-la sem duplicação em uma futura API pública.

## Limites conhecidos

Registrado aqui de propósito, porque são decisões de escopo e não omissões.

**Calendário e reservas existentes.** Cadastrar um feriado ou um bloqueio não
cancela as reservas e palestras já marcadas na data: o bloqueio impede as
novas. Cancelar as antigas é decisão da administração, reserva a reserva.

**Feriados no seed.** O `seed.sql` cria só o período letivo, sem feriados: os
testes reservam em datas relativas a hoje, e um feriado fixo os faria falhar
no dia em que caíssem nele. Os feriados são cadastrados pela tela.

**Edição de palestra.** A palestra é cadastrada e excluída, não editada:
mudar o horário de uma palestra com inscritos pede avisar cada um, o que fica
para depois.
