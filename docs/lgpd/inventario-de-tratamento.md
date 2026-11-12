# Inventário das operações de tratamento

Levantamento feito antes de escrever a Política de Privacidade e os Termos de
Uso, conforme a Seção 1 das orientações da disciplina. Descreve o que o sistema
faz hoje, não o que pretende fazer.

Versão 1.2, de 12/11/2026, revista na validação da entrega de 16/11: convite
pela administração, turma do aluno, agenda restrita por papel e site publicado.
Versão 1.1: alunos como titulares (palestras) e chamados de suporte.

## Dados tratados

### Nome e e-mail institucional

- **De quem**: professores, pessoal da administração, equipe de TI e alunos.
- **Onde é coletado**: não há coleta pelo titular nem cadastro aberto. A
  administração convida a pessoa pela tela Configurações, Usuários, informando
  nome, e-mail e papel; o convite chega por e-mail e a pessoa só define a
  própria senha.
- **Finalidade**: identificar quem usa o sistema, autenticar o acesso e enviar
  os avisos: reserva registrada em nome do professor, chamado resolvido ao
  solicitante e palestra nova aos alunos dos cursos de destino.
- **Obrigatório?** Sim. Sem identificação não há como decidir permissões nem
  atribuir a autoria de uma reserva.
- **Onde fica**: `auth.users` e `professors`, no Supabase, região São Paulo.
- **Quem alcança**: o próprio titular vê seus dados; a administração vê todos,
  porque precisa saber em nome de quem reserva. Professores veem o nome uns dos
  outros na agenda, que é informação necessária para saber de quem é a aula.
- **Retenção**: enquanto durar o vínculo, ou até o titular pedir remoção.
- **Compartilhamento**: Supabase (armazenamento), Resend (nome e endereço do
  destinatário, no momento do envio, inclusive o convite e a recuperação de
  senha, que o Supabase Auth envia pelo SMTP do Resend).

### Senha

- **Onde é coletada**: tela de login e tela de definição de nova senha.
- **Finalidade**: autenticar o acesso.
- **Onde fica**: `auth.users`, como resumo criptográfico com sal, gerado e
  verificado pelo Supabase Auth. Nunca em texto legível, nunca em log.
- **Quem alcança**: ninguém. Nem a administração nem o desenvolvedor têm acesso
  ao valor original.
- **Retenção**: enquanto a conta existir.

### Segundo fator de autenticação

- **Onde é coletado**: tela de configuração do segundo fator, no primeiro
  acesso. O segredo é gerado pelo servidor e exibido como QR code.
- **Finalidade**: confirmar a identidade em cada acesso.
- **Onde fica**: no cofre de fatores do Supabase Auth.
- **Obrigatório?** Sim, para todos os papéis.
- **Retenção**: enquanto a conta existir.

### Papel e vínculo de professor

- **O que é**: o papel no sistema, e as disciplinas e turmas que o professor
  leciona em determinado período letivo.
- **Onde é coletado**: definido pela administração no convite ou na edição do
  usuário; os vínculos, no cadastro acadêmico.
- **Finalidade**: decidir o que cada pessoa pode fazer, e validar se a reserva
  corresponde a uma atividade que a pessoa de fato leciona.
- **Onde fica**: `profiles` e `teaching_assignments`.
- **Quem altera**: apenas a administração. Uma trigger no banco impede que o
  titular altere o próprio papel ou vínculo.
- **Retenção**: enquanto durar o vínculo.

### Curso e turma do aluno

- **O que é**: o curso e a turma aos quais a conta de aluno pertence. O curso
  segue a turma: uma trigger alinha os dois.
- **Onde é coletado**: definido pela administração no convite ou na edição do
  usuário.
- **Finalidade**: mostrar ao aluno a agenda da sua turma e as palestras do seu
  curso, liberar a inscrição nelas, decidir quem recebe o aviso de palestra
  nova e contar os alunos de cada turma, que é o que o sistema compara com a
  capacidade do espaço.
- **Onde fica**: `profiles.course_id` e `profiles.class_id`.
- **Quem altera**: apenas a administração; a mesma trigger que protege o papel
  impede o aluno de trocar o próprio curso ou a própria turma.
- **Retenção**: enquanto a conta existir.

### Inscrições em palestras

- **O que é**: a palestra e o momento da inscrição.
- **Onde é coletado**: botão de inscrição na tela de palestras.
- **Finalidade**: controlar as vagas de cada palestra.
- **Quem alcança**: o próprio aluno e a administração. Os demais veem apenas a
  quantidade de inscritos, por uma função que não devolve quem são.
- **Retenção**: preservadas como registro da palestra. Ao remover a conta, as
  inscrições em palestras futuras são apagadas e liberam a vaga.

### Chamados de suporte

- **O que é**: espaço, descrição do problema, prioridade, quem abriu, quem
  atendeu, datas de cada etapa e a nota de solução.
- **Onde é coletado**: formulário de abertura (professor e administração) e
  formulário de resolução (equipe de TI).
- **Finalidade**: registrar e resolver problemas nos espaços.
- **Quem alcança**: quem abriu vê os próprios; a equipe de TI e a
  administração veem todos.
- **Retenção**: preservados como histórico de manutenção. Ao remover a conta,
  os chamados ainda abertos são cancelados e o nome some, como nas reservas.
- **Observação**: a descrição é texto livre; os termos de uso orientam a não
  incluir dados pessoais nela.

### Reservas

- **O que é**: espaço, data, horário, finalidade, tipo de atividade, turma,
  disciplina, professor responsável e quem registrou.
- **Onde é coletado**: formulário de nova reserva.
- **Finalidade**: gerir a ocupação dos espaços e evitar conflitos.
- **Quem alcança**: depende do papel, e a regra está no banco (política
  "agenda visivel conforme o papel"). A administração e os professores leem a
  agenda inteira, porque um horário ocupado precisa aparecer ocupado para quem
  tenta reservá-lo; o aluno lê só as reservas da sua turma; a equipe de TI não
  lê reservas. Alterar e remover, só o professor responsável, quem registrou,
  ou a administração. A restrição do professor às próprias turmas está
  planejada (relatório de validação, achado A5).
- **Retenção**: até o fim do projeto acadêmico, como registro de uso dos
  espaços. Se a conta for removida antes, ficam sem ligação com a pessoa.

### Registros de acesso

- **O que é**: data e hora do último acesso, endereço IP e navegador.
- **Onde é coletado**: gerados pelo Supabase Auth a cada login e renovação de
  sessão.
- **Finalidade**: proteger as contas e investigar acessos indevidos.
- **Onde fica**: esquema `auth` do Supabase, fora das tabelas da aplicação.
- **Quem alcança**: ninguém pela aplicação; só o painel do Supabase.
- **Retenção**: a do serviço de autenticação, limitada ao fim do projeto.

### Registros de auditoria

- **O que é**: data e hora, autor, ação, entidade afetada e os estados anterior
  e posterior do dado.
- **Onde é coletado**: gerados pelo sistema, não informados por ninguém. As
  alterações em reservas vêm de uma trigger no banco; os eventos de acesso, da
  aplicação.
- **Finalidade**: permitir rastrear quem alterou o quê e quando.
- **Quem alcança**: apenas a administração.
- **Retenção**: até o fim do projeto acadêmico. Ao remover a conta, o e-mail
  da pessoa é apagado dos registros e o autor fica sem nome; o evento
  permanece.
- **Observação**: não são gravados senha, token, segredo de segundo fator nem
  conteúdo de cookie. Na falha de login é registrado o endereço tentado, para
  que um ataque por tentativa e erro seja identificável.

## Cookies

Os únicos cookies são os de sessão, emitidos pelo Supabase Auth. Sem eles não
há como permanecer autenticado. Não há cookie de análise, de publicidade nem de
terceiros, e por isso não há banner de consentimento: criar um seria sugerir
uma escolha que não existe.

## Fluxo dos dados

O diagrama e o fluxo de cada operação estão em
[fluxo-de-dados.md](fluxo-de-dados.md).

## O que o sistema não trata

Não há CPF, data de nascimento, endereço residencial, telefone, fotografia,
documento digitalizado, dado de saúde, dado financeiro nem biometria. Não há
dados de crianças e adolescentes: os titulares são professores, pessoal
administrativo e alunos de ensino superior. Não há uso de inteligência artificial sobre dados pessoais.

Dos alunos, o sistema guarda apenas nome, e-mail institucional, curso e
turma, o mínimo para mostrar a agenda da turma, liberar a inscrição em
palestras e enviar o aviso de palestra nova. Notas, frequência e desempenho não
existem no sistema.
