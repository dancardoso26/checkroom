# Evidências de implementação e teste dos controles

Versão 1.0, de 12/11/2026. Atende ao item 12 da Seção 6 das orientações da
disciplina. As evidências vêm de três fontes independentes: um script que tenta
burlar as permissões direto no banco, os testes de ponta a ponta e os testes
unitários.

## 1. Tentativas de burlar as permissões, direto no banco

O script [evidencias/controles-no-banco.sql](evidencias/controles-no-banco.sql)
entra no banco como o papel `authenticated`, com a identidade de uma conta, e
tenta ler e alterar o que aquele papel não deveria. É o mesmo caminho de quem
usasse a chave publicável fora do site, sem passar pela interface nem pelas
Server Actions. Tudo roda dentro de uma transação desfeita no fim
(`rollback`), então nada é gravado.

Para repetir: abrir o SQL Editor do Supabase, colar o script, trocar o e-mail
na linha 3 e executar.

Resultado de 12/11/2026, com as quatro contas de demonstração:

| Verificação | Aluno | Professor | Equipe de TI | Administração |
|---|---|---|---|---|
| Reservas que consegue ler | 86 de 541 | 541 | **0** | 541 |
| Reservas de outra turma que consegue ler | **0** | não se aplica | não se aplica | não se aplica |
| Perfis que consegue ler | **1** (o próprio) | **1** | **1** | 36 |
| Registros de auditoria que consegue ler | **0** | **0** | **0** | todos |
| Chamados que consegue ler | **0** | 2 (os que abriu) | 18 | 18 |
| Inscrições de outras pessoas que consegue ler | **0** | **0** | **0** | 47 |
| Trocar o próprio papel para administrador | recusado | recusado | recusado | não se aplica |
| Trocar a própria turma | recusado | recusado | recusado | não se aplica |
| Gravar um registro na auditoria | recusado | recusado | recusado | **recusado** |
| Apagar a auditoria | recusado | recusado | recusado | **recusado** |
| Alterar reserva de outro professor | 0 linhas | **0 linhas** | nenhuma visível | permitido |
| Mudar a situação de um chamado por `update` | recusado | recusado | **recusado** | **recusado** |
| Remover outro usuário | recusado | recusado | recusado | permitido |

As mensagens de recusa vêm do próprio banco: "Apenas a administração altera o
papel de um usuário.", "Apenas a administração altera o curso e a turma do
aluno.", "Apenas a administração remove usuários." e "permission denied for
table audit_logs".

Três resultados merecem leitura:

- **A auditoria é imutável até para a administração.** Nenhum papel tem
  permissão de escrita em `audit_logs`; o único caminho de gravação são as
  triggers e as funções do banco.
- **A TI resolve chamados, mas não por `update`.** Nem a administração altera
  a situação de um chamado direto: a transição só existe pelas funções
  `assumir_chamado`, `devolver_chamado` e `resolver_chamado`, que conferem o
  papel e a situação atual juntos.
- **O professor lê as 541 reservas.** É a lacuna registrada no
  [registro de medidas](medidas-de-seguranca.md), item 3 das limitações. Ele
  lê, mas não altera: a tentativa de alterar a reserva de outro professor
  atinge 0 linhas.

Depois das quatro execuções, uma consulta conferiu que nenhum registro de
auditoria tinha sido criado nos 15 minutos anteriores e que nenhum perfil tinha
sido anonimizado: o `rollback` desfez tudo.

## 2. Testes de ponta a ponta

Rodam no navegador contra o site e o banco reais (`tests/e2e/`). Os que
exercitam controles de privacidade e segurança:

| Controle | Teste |
|---|---|
| Sem login não há acesso | `autenticacao.spec.ts`: "exige login para chegar à agenda" |
| Segundo fator obrigatório | "exige o segundo fator antes de liberar o sistema"; "cadastra e verifica o segundo fator" |
| Login não revela se o e-mail existe | "recusa senha incorreta sem dizer se o e-mail existe" |
| Login e saída entram na auditoria | "o login entra no log de auditoria"; "sair encerra a sessão" |
| Auditoria só para a administração | "o log de auditoria é exclusivo da administração" |
| Sessão só com senha não troca a senha | "a sessão aberta só com a senha não troca a senha" |
| Redirecionamento só para o próprio site | "o login não segue destino que aponta para outro site" |
| Cabeçalhos de segurança | "as respostas trazem os cabeçalhos de segurança" |
| Termos e política acessíveis sem login | "termos e privacidade são lidos sem login" |
| Versão nova dos termos pede novo aceite | "uma versão nova dos termos pede o aceite de novo" |
| Professor reserva só em nome próprio | "o professor reserva apenas em seu próprio nome" |
| Professor só gerencia o que é dele | `permissoes-da-agenda.spec.ts`: "o professor só tem ações nas reservas que são dele" |
| TI só acessa chamados | "a equipe de TI só acessa os chamados" |
| Aluno sem acesso a chamados | `chamados.spec.ts`: "o aluno não tem acesso aos chamados" |
| Aluno só vê palestras do seu curso | `palestras.spec.ts`: "o aluno do curso se inscreve e cancela; o de outro curso nem vê" |
| Gestão de usuários só para a administração | `usuarios.spec.ts`: "quem não administra não abre a gestão de usuários" |
| Remoção apaga o que identificava a pessoa | "excluir um usuário apaga o que o identificava" |
| Dashboard só para a administração | `painel.spec.ts`: "quem não administra não vê o dashboard" |

## 3. Testes unitários

Rodados em 12/11/2026 (`npx vitest run src/domain/auth src/domain/documentos
src/lib/email`): **8 arquivos, 68 testes, todos passando.** Cobrem:

| Arquivo | O que garante |
|---|---|
| `permissoes.test.ts` | A decisão de quem pode o quê, inclusive o caso de dois perfis sem vínculo de professor não serem tratados como donos das reservas um do outro |
| `segundo-fator.test.ts` | A dispensa do segundo fator nunca vale em produção |
| `senha.test.ts` | As regras mínimas de senha |
| `troca-de-senha.test.ts` | Quais sessões podem trocar a senha |
| `destino-apos-login.test.ts` | O destino depois do login nunca aponta para fora do site |
| `documentos.test.ts` | O aceite só vale para a versão vigente dos termos |
| `destinatario.test.ts`, `remetente.test.ts` | Para quem e de onde sai cada e-mail |

## 4. Verificações no site publicado

Feitas em 12/11/2026 em [https://checkroom.com.br](https://checkroom.com.br):

- a resposta traz `Strict-Transport-Security` de dois anos e a
  `Content-Security-Policy` com `frame-ancestors 'none'`;
- o domínio não tem registro MX, o que significa que o endereço de privacidade
  publicado na política ainda não recebe e-mail (ver o
  [relatório de validação](relatorio-de-validacao.md)).
