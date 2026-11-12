# Relatório de validação da aplicação da LGPD

Validação feita em 12/11/2026 para a entrega de 16/11, que pede "validar
aplicação da LGPD sobre os dados sensíveis". O critério é o da Seção 7 das
orientações da disciplina: "a coerência entre documentação, banco de dados,
código, interfaces, permissões e comportamento real do sistema".

## Método

Cada afirmação dos documentos de LGPD e das páginas `/termos` e `/privacidade`
foi conferida contra quatro fontes:

1. **O banco em produção**, lido pelo estado atual (`supabase/estado-atual/`) e
   por consultas de leitura no projeto publicado.
2. **Um script que tenta burlar as permissões** com a identidade de cada papel,
   desfeito no fim. Resultado em
   [evidencias-dos-controles.md](evidencias-dos-controles.md).
3. **O código** das Server Actions, do `proxy.ts` e das bibliotecas usadas.
4. **O site publicado**: cabeçalhos HTTP e registros de DNS do domínio.

## Dados sensíveis

O CheckRoom **não trata dados pessoais sensíveis** no sentido do art. 5º, II da
LGPD (origem racial ou étnica, convicção religiosa, opinião política, saúde,
vida sexual, dado genético ou biométrico, filiação a sindicato ou organização).
A conferência foi feita coluna por coluna no estado atual do banco: as tabelas
guardam nome, e-mail, papel, curso, turma, vínculo de professor, reservas,
chamados, inscrições e auditoria. Também não há dados financeiros, documentos,
imagens nem dados de crianças: os titulares são professores, pessoal
administrativo e alunos de graduação.

Os dados que merecem mais proteção, mesmo sem serem sensíveis pela lei, são:

| Dado | Por que | Proteção |
|---|---|---|
| Senha e segredo do segundo fator | Permitem usar a conta de outra pessoa | Hash com sal e cofre de fatores do Supabase Auth; ninguém lê o valor |
| E-mail digitado nas falhas de login | Mostra quem foi alvo de tentativas | Só a administração lê a auditoria; o e-mail é apagado dela quando a conta é removida |
| Rotina de aulas do professor | Diz onde a pessoa está e quando | Lacuna: hoje todo professor lê a agenda inteira (achado A5) |
| Inscrições em palestras | Dizem onde o aluno vai estar | Só o próprio aluno e a administração veem quem se inscreveu |

Por não haver dado sensível, criança, saúde, biometria, finanças nem IA, o item
11 da Seção 6 (avaliação específica dessas áreas) não se aplica. A Seção 5.1
(Educação) se aplica e está atendida: os perfis de aluno, professor, TI e
administração são separados, e o sistema não trata notas, frequência nem
desempenho.

## Os doze entregáveis da Seção 6

| # | Entregável | Situação | Onde |
|---|---|---|---|
| 1 | Política de Privacidade coerente com o sistema | Atende, desde a versão 1.3 (A2) | `/privacidade` |
| 2 | Termos de Uso coerentes com as funcionalidades | Atende, desde a versão 1.3 (A2) | `/termos` |
| 3 | Inventário e diagrama do fluxo | Atende | [inventario-de-tratamento.md](inventario-de-tratamento.md), [fluxo-de-dados.md](fluxo-de-dados.md) |
| 4 | Matriz de dado, finalidade, hipótese legal, acesso, compartilhamento e retenção | Atende | [matriz-de-dados.md](matriz-de-dados.md) |
| 5 | Matriz de perfis e permissões | Atende | [matriz-de-perfis.md](matriz-de-perfis.md) |
| 6 | Plano de retenção e descarte | Atende | [plano-de-retencao.md](plano-de-retencao.md) |
| 7 | Plano de resposta a incidentes | Atende | [resposta-a-incidentes.md](resposta-a-incidentes.md) |
| 8 | Fornecedores e APIs externas | Atende | [fornecedores.md](fornecedores.md) |
| 9 | Registro das medidas técnicas de segurança | Atende | [medidas-de-seguranca.md](medidas-de-seguranca.md) |
| 10 | Procedimento de atendimento aos titulares | Parcial: o canal por e-mail não recebe mensagens (A1) | [direitos-dos-titulares.md](direitos-dos-titulares.md) |
| 11 | Avaliação de áreas específicas | Não se aplica | Seção "Dados sensíveis" acima |
| 12 | Evidências de implementação e teste | Atende | [evidencias-dos-controles.md](evidencias-dos-controles.md) |

Os documentos 3 a 6 e 8 foram revistos nesta validação, porque descreviam o
sistema de setembro: agenda aberta a todos, TI lendo reservas, turma como um
número sem alunos e Vercel ainda não publicada.

## Os critérios da Seção 7

| A orientação considera insuficiente | Situação no CheckRoom |
|---|---|
| Copiar política genérica ou declarar conformidade sem demonstrá-la | Atende. A política descreve o sistema real, e este relatório registra o que ainda não está conforme em vez de omitir |
| Usar consentimento obrigatório para todo tratamento | Atende. Nenhum tratamento se apoia em consentimento; as bases são execução de contrato e legítimo interesse, com avaliação documentada |
| Esconder funções apenas no frontend | Atende. O script de evidências contorna a interface e o banco recusa |
| Senha em texto puro ou chave de API versionada | Atende. Senha com hash; chaves só em variáveis de ambiente |
| Dados reais de alunos ou pacientes em testes | Parcial (A8). As contas de teste são fictícias, mas os testes rodam no banco onde estão as contas reais de três pessoas |
| Manter dados indefinidamente ou prometer exclusão sem implementá-la | Atende. A exclusão é a função `anonimizar_conta`, testada de ponta a ponta; os prazos foram unificados nesta revisão (A2) |
| Usar IA sem informar | Não se aplica: não há IA no sistema |
| Transferir ao usuário toda a responsabilidade pela segurança | Atende. Os termos atribuem ao usuário só a guarda da senha e do autenticador |
| Confundir Termos de Uso com Política de Privacidade | Atende. São páginas separadas, com aceite registrado por versão |

## Achados

Ordenados por gravidade. A2, A7, A9 e A12 foram corrigidos em 12/11, no mesmo
dia da validação; cada um diz como foi conferido.

### A1. O canal de privacidade não recebe e-mail (alta)

A política publica `privacidade@checkroom.com.br` como canal para os pedidos
dos titulares, mas o domínio não tem registro MX: uma mensagem enviada para lá
volta. A Seção 2.7 é explícita: "um endereço inexistente ou um botão que não
executa a exclusão não atende ao requisito".

**Ação:** criar o redirecionamento do endereço para a caixa do autor. A
Hostinger, onde está o DNS, oferece redirecionamento de e-mail; outra opção é
um serviço de encaminhamento gratuito que só exige os registros MX. Depois,
enviar uma mensagem de teste e anotar a data neste relatório.

### A2. Política e termos descrevem o sistema de outubro (média)

Trechos que não correspondem mais ao comportamento real:

- a política diz que, dos alunos, o sistema guarda só "nome, e-mail e curso" e
  que "o tamanho de cada turma continua sendo só um número". Desde 06/11 o
  aluno tem turma, e a contagem vem dos alunos vinculados;
- a política diz que a Vercel hospedará a aplicação "quando ela for
  publicada", e a seção de transferência internacional fala em região a
  definir. O site está publicado desde 06/11, em São Paulo (`gru1`);
- os termos dizem que a equipe de TI pode "consultar a agenda" e que o aluno
  consulta "a agenda e as palestras do seu curso". Desde 07/11 a TI não lê a
  agenda, e o aluno vê a agenda da sua turma;
- o plano de retenção dizia "indefinido" para reservas e auditoria, e a
  política publicada diz "até o fim do projeto acadêmico".

**Corrigido em 12/11.** Documentos de LGPD revistos, e política e termos
publicados na versão 1.3, com os prazos de retenção unificados. A mudança de
versão pede o aceite de novo a todas as contas no próximo acesso.

### A3. O segundo fator não é exigido pelo banco (média)

O `proxy.ts` exige a sessão completa (`aal2`), mas as políticas de RLS não. Uma
senha descoberta dá uma sessão `aal1`, e com ela a API do Supabase responde
direto, sem passar pelo proxy. O dano é limitado ao que aquele papel lê, mas
torna o segundo fator contornável para leitura.

**Ação:** políticas restritivas exigindo `aal2` nas tabelas de `public`. Já
está no `TASKS.md`; recomendado antes da banca.

### A4. O aceite dos termos não é conferido no proxy (média)

No primeiro acesso a tela inicial carrega antes da página de aceite. Quem não
aceitou os termos consegue ver dados por um instante, e a API responde mesmo
sem aceite.

**Ação:** conferir a versão aceita no `proxy.ts`. Já está no `TASKS.md`.

### A5. O professor lê a agenda inteira (média)

A política de leitura restringe aluno e TI, mas não o professor, que vê as
reservas de todos os colegas. É a rotina de aulas de outras pessoas, sem
necessidade para a função de quem consulta. Contraria a Seção 4.3
("professores devem acessar suas turmas").

**Ação:** já está no `TASKS.md` como "Agenda do professor restrita às turmas
dele".

### A6. Testes e produção no mesmo banco (média)

Os testes de ponta a ponta rodam no banco do site, onde também estão as contas
reais de três pessoas. A Seção 4.4 pede ambientes separados. Os testes só
mexem nos dados que eles mesmos criam, marcados com `[e2e]`, mas um erro num
teste alcançaria dados reais.

**Ação:** registrado como decisão consciente do protótipo em
`docs/publicacao-na-vercel.md` e nas limitações do registro de medidas. A
correção é um segundo projeto Supabase só para testes.

### A7. A anonimização mantém curso e turma do aluno (baixa)

`anonimizar_perfil` apaga nome, vínculo de professor e e-mail, mas deixa
`course_id` e `class_id` no perfil do aluno. Numa turma pequena (a SI 8 tem
três alunos), curso, turma e as inscrições passadas podem bastar para
identificar a pessoa.

**Corrigido em 12/11** pela migration
`20261112000000_anonimizacao_limpa_curso_e_turma.sql`. Conferido anonimizando
a conta `aluno@umc.br` numa transação desfeita: curso e turma ficaram nulos, e
a conta voltou intacta depois do `rollback`.

### A8. Limite de tentativas de senha medido no servidor (baixa)

O login passa pela Server Action, então o Supabase conta as tentativas pelo IP
da Vercel, não do usuário. A contenção real é o segundo fator e o registro de
`login_failed`.

**Ação:** repassar o IP do usuário no cabeçalho `Sb-Forwarded-For`, se houver
tempo. Registrado nas limitações.

### A9. Cookie de sessão sem `Secure` (baixa)

O padrão do `@supabase/ssr` não marca o cookie como `Secure` nem `HttpOnly`. O
HSTS impede o envio por HTTP, e o `HttpOnly` não é possível porque o cliente do
navegador lê a sessão.

**Corrigido em 12/11**: `src/lib/supabase/opcoes-de-cookie.ts` marca o cookie
como `Secure` em produção, e os três clientes do Supabase (servidor, navegador
e `proxy.ts`) usam essa opção. O `HttpOnly` continua de fora, pelo motivo
acima.

### A10. Contas de demonstração num domínio real (baixa)

As contas `adm@umc.br`, `professor@umc.br`, `aluno@umc.br` e `suporte@umc.br`
usam o domínio da universidade. Os avisos de reserva e de palestra dessas
contas são enviados de fato ao servidor de e-mail da UMC.

**Ação:** nenhuma antes da banca, para não mexer nas contas da demonstração.
Depois, trocar para um domínio próprio do projeto.

### A11. Sem cópia de segurança (baixa)

O plano gratuito do Supabase não faz backup automático.

**Ação:** `supabase db dump` antes de cada entrega, guardado fora do
repositório.

### A12. O filtro de palestras por curso está só na tela (baixa)

A política "palestra visivel fora da TI" liberava todas as palestras para
qualquer papel que não fosse a TI. A tela do aluno mostra só as do seu curso,
mas pela API ele lia as palestras dos outros cursos: título, data, espaço e
professor palestrante. São dados de pouco risco, mas é exatamente o caso que a
Seção 4.3 descreve ("esconder no frontend não é controle de acesso"). A
inscrição, essa sim, é conferida no banco por `inscrever_em_palestra`.

**Corrigido em 12/11** pela migration
`20261112000100_palestras_do_curso_do_aluno.sql`, que troca a política por
"palestra visivel conforme o papel". Conferido com a identidade de cada papel:
o aluno lê 9 das 14 palestras, exatamente as do seu curso; o professor continua
lendo as 14; a TI, nenhuma.

## Conclusão

A base está correta e é demonstrável: o banco recusa, sozinho, tudo o que cada
papel não deveria fazer, a exclusão é real e testada, a auditoria não pode ser
alterada nem pela administração e não há dado sensível. O que separa o sistema
de "coerente" são o canal de e-mail que não funciona (A1), que depende de
configurar o domínio, e as três lacunas de controle de acesso que já tinham
plano (A3, A4 e A5). Os demais achados ou foram corrigidos no mesmo dia (A2,
A7, A9 e A12) ou ficam registrados como limitação assumida do protótipo.
