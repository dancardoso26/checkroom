# Matriz de dado, finalidade, hipótese legal, acesso e retenção

Versão 1.1, de 12/11/2026, revista na validação da entrega de 16/11. Deriva
do [inventário de tratamento](inventario-de-tratamento.md) e é a base da
Política de Privacidade publicada em `/privacidade`.

| Dado | Finalidade | Hipótese legal | Quem acessa | Compartilhado com | Retenção | Destino |
|---|---|---|---|---|---|---|
| Nome | Identificar o responsável pela atividade e por cada operação | Execução de contrato (art. 7º, V) | Titular e administração; professores veem o nome do responsável na agenda | Supabase, Resend | Enquanto a conta existir | Anonimização |
| E-mail institucional | Autenticar, convidar, recuperar a senha e enviar os avisos | Execução de contrato (art. 7º, V) | Titular e administração | Supabase, Resend | Enquanto a conta existir | Trocado por endereço sem correspondência real |
| Senha | Autenticar o acesso | Execução de contrato (art. 7º, V) | Ninguém: armazenada como resumo criptográfico | Supabase | Enquanto a conta existir | Conta bloqueada |
| Segundo fator | Confirmar identidade a cada acesso | Legítimo interesse em segurança (art. 7º, IX) | Ninguém: o segredo não é exibido após o cadastro | Supabase | Enquanto a conta existir | Conta bloqueada |
| Papel no sistema | Decidir o que cada pessoa pode fazer | Execução de contrato (art. 7º, V) | Titular e administração | Supabase | Enquanto a conta existir | Mantido, sem nome |
| Vínculo de professor | Validar se a reserva corresponde a atividade que a pessoa leciona | Execução de contrato (art. 7º, V) | Autenticados, no cadastro acadêmico | Supabase | Período letivo | Desfeito na remoção da conta |
| Curso e turma do aluno | Mostrar a agenda da turma e as palestras do curso, avisar de palestra nova e contar os alunos da turma | Execução de contrato (art. 7º, V) | Titular e administração | Supabase | Enquanto a conta existir | Desvinculados na anonimização |
| Reservas | Gerir a ocupação dos espaços e evitar conflitos | Execução de contrato (art. 7º, V) | Administração e professores leem todas; aluno, só as da sua turma; TI, nenhuma. Alteram só responsável, autor e administração | Supabase, Resend | Até o fim do projeto acadêmico | Futuras canceladas e passadas sem ligação com a pessoa na remoção da conta |
| Inscrições em palestras | Controlar as vagas | Execução de contrato (art. 7º, V) | O próprio aluno e a administração; os demais veem só a quantidade | Supabase | Até o fim do projeto acadêmico | As de palestras futuras são apagadas na remoção da conta |
| Chamados de suporte | Registrar e resolver problemas nos espaços | Execução de contrato (art. 7º, V) | Quem abriu, a equipe de TI e a administração | Supabase, Resend | Até o fim do projeto acadêmico | Os abertos são cancelados na remoção da conta |
| Registros de acesso (IP, navegador, último acesso) | Proteger as contas e investigar acessos indevidos | Legítimo interesse em segurança (art. 7º, IX) | Só pelo painel do Supabase | Supabase | Retenção do serviço, limitada ao fim do projeto | Excluídos |
| Registros de auditoria | Rastrear alterações e acessos | Legítimo interesse em rastreabilidade (art. 7º, IX) | Apenas administração | Supabase | Até o fim do projeto acadêmico | E-mail da pessoa apagado na remoção da conta |
| Cookies de sessão | Manter a pessoa autenticada entre requisições | Execução de contrato (art. 7º, V) | O próprio navegador | Nenhum | Duração da sessão | Expiram |

## Sobre o não uso de consentimento

Nenhuma finalidade acima se apoia em consentimento, e isso é deliberado. A
Seção 7 das orientações da disciplina considera insuficiente "usar
consentimento obrigatório para todo tratamento", e com razão: consentimento
pressupõe escolha real e revogável. Quem precisa reservar uma sala para dar
aula não tem como recusar o tratamento do próprio nome e continuar usando o
sistema, então apresentar isso como escolha seria falso.

As duas hipóteses aplicadas são:

**Execução de contrato** para o que o serviço não funciona sem: identificação,
autenticação, permissões e as próprias reservas.

**Legítimo interesse** para segurança e rastreabilidade. Segue a avaliação
exigida quando essa é a base:

- *Finalidade legítima*: impedir uso indevido de conta alheia e permitir
  reconstruir quem alterou uma reserva. Ambas são expectativas razoáveis de
  quem usa um sistema institucional de agendamento.
- *Necessidade*: não há meio menos invasivo. Sem trilha de auditoria não há
  como saber quem cancelou a aula de outra pessoa; sem segundo fator, uma senha
  vazada basta para reservar em nome de terceiros.
- *Expectativa do titular*: quem usa um sistema corporativo espera que acessos
  sejam registrados. A tela de conta e a política dizem isso explicitamente, em
  vez de deixar implícito.
- *Salvaguardas*: a auditoria é legível apenas pela administração, não registra
  senha, token nem segredo de segundo fator, e não pode ser alterada nem
  apagada pela aplicação. O segundo fator guarda um segredo que não é exibido
  novamente após o cadastro.
- *Oposição*: quem não quiser o tratamento pode encerrar a conta pela tela de
  conta, o que anonimiza o perfil. A trilha permanece sem vínculo com a pessoa,
  pelo motivo registrado na seção seguinte.

## Sobre o que não é apagado

O direito de eliminação não alcança dois conjuntos de dados, e a política diz
isso de forma direta em vez de prometer o que o sistema não faria:

**Reservas já realizadas** documentam o uso de espaços da instituição. São
registro dela sobre seu próprio patrimônio, não dado que o titular disponha
livremente.

**Registros de auditoria** perderiam a função se pudessem ser apagados por quem
foi auditado. Manter a trilha é o que sustenta a afirmação de rastreabilidade.

Nos dois casos o que desaparece é a ligação com a pessoa: o nome no perfil é
substituído por "Usuário removido" e o vínculo entre conta e professor é
desfeito. A chave estrangeira `bookings.created_by` usa `on delete restrict`
justamente para que o banco recuse apagar um perfil que responde por reservas,
obrigando o caminho da anonimização.
