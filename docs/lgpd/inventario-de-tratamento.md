# Inventário das operações de tratamento

Levantamento feito antes de escrever a Política de Privacidade e os Termos de
Uso, conforme a Seção 1 das orientações da disciplina. Descreve o que o sistema
faz hoje, na entrega de 28/09/2026, não o que pretende fazer.

Versão 1.0.

## Dados tratados

### Nome e e-mail institucional

- **De quem**: professores e pessoal da administração.
- **Onde é coletado**: não há coleta pelo titular. As contas são criadas pela
  instituição por meio de um script administrativo, a partir do cadastro
  funcional que ela já possui.
- **Finalidade**: identificar quem usa o sistema, autenticar o acesso e enviar
  o aviso de reserva registrada em nome do professor.
- **Obrigatório?** Sim. Sem identificação não há como decidir permissões nem
  atribuir a autoria de uma reserva.
- **Onde fica**: `auth.users` e `professors`, no Supabase, região São Paulo.
- **Quem alcança**: o próprio titular vê seus dados; a administração vê todos,
  porque precisa saber em nome de quem reserva. Professores veem o nome uns dos
  outros na agenda, que é informação necessária para saber de quem é a aula.
- **Retenção**: enquanto durar o vínculo, ou até o titular pedir remoção.
- **Compartilhamento**: Supabase (armazenamento), Resend (apenas o endereço do
  destinatário, no momento do envio).

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

### Papel e vínculo docente

- **O que é**: o papel no sistema, e as disciplinas e turmas que o professor
  leciona em determinado período letivo.
- **Onde é coletado**: cadastro pela instituição, no seed ou por script.
- **Finalidade**: decidir o que cada pessoa pode fazer, e validar se a reserva
  corresponde a uma atividade que a pessoa de fato leciona.
- **Onde fica**: `profiles` e `teaching_assignments`.
- **Quem altera**: apenas a administração. Uma trigger no banco impede que o
  titular altere o próprio papel ou vínculo.
- **Retenção**: enquanto durar o vínculo.

### Reservas

- **O que é**: espaço, data, horário, finalidade, tipo de atividade, turma,
  disciplina, professor responsável e quem registrou.
- **Onde é coletado**: formulário de nova reserva.
- **Finalidade**: gerir a ocupação dos espaços e evitar conflitos.
- **Quem alcança**: todas as pessoas autenticadas leem a agenda inteira, porque
  um horário ocupado precisa aparecer ocupado para quem tenta reservá-lo.
  Alterar e remover, só o professor responsável, quem registrou, ou a
  administração.
- **Retenção**: preservadas como registro institucional de uso dos espaços,
  mesmo após a remoção da conta.

### Registros de auditoria

- **O que é**: data e hora, autor, ação, entidade afetada e os estados anterior
  e posterior do dado.
- **Onde é coletado**: gerados pelo sistema, não informados por ninguém. As
  alterações em reservas vêm de uma trigger no banco; os eventos de acesso, da
  aplicação.
- **Finalidade**: permitir rastrear quem alterou o quê e quando.
- **Quem alcança**: apenas a administração.
- **Retenção**: preservados. Ao remover a conta, o autor é anonimizado, mas o
  evento permanece.
- **Observação**: não são gravados senha, token, segredo de segundo fator nem
  conteúdo de cookie. Na falha de login é registrado o endereço tentado, para
  que um ataque por tentativa e erro seja identificável.

## Cookies

Os únicos cookies são os de sessão, emitidos pelo Supabase Auth. Sem eles não
há como permanecer autenticado. Não há cookie de análise, de publicidade nem de
terceiros, e por isso não há banner de consentimento: criar um seria sugerir
uma escolha que não existe.

## Fluxo dos dados

```
Navegador
   │  formulário de reserva, credenciais
   ▼
Aplicação Next.js (servidor)
   │  valida sessão e papel, aplica a regra de negócio
   ▼
Supabase (PostgreSQL + Auth) ── São Paulo
   │  políticas de RLS avaliam o que cada papel alcança
   │  trigger grava a trilha de auditoria
   │
   └─► Resend ── São Paulo
         nome e e-mail do destinatário, dados da reserva
```

A aplicação nunca entrega ao navegador a chave secreta do banco nem a chave da
API de e-mail: ambas existem apenas como variáveis de ambiente do servidor.

## O que o sistema não trata

Não há CPF, data de nascimento, endereço residencial, telefone, fotografia,
documento digitalizado, dado de saúde, dado financeiro nem biometria. Não há
dados de crianças e adolescentes, porque os titulares são professores e pessoal
administrativo. Não há uso de inteligência artificial sobre dados pessoais.

Alunos ainda não são titulares neste sistema: `classes.student_count` guarda
apenas a quantidade de alunos da turma, um número, sem nenhum dado individual.
Quando o módulo de palestras exigir inscrição nominal, este inventário precisa
ser revisto antes da implementação.
