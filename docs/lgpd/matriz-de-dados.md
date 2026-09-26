# Matriz de dado, finalidade, hipótese legal, acesso e retenção

Versão 1.0, de 22/09/2026. Deriva do
[inventário de tratamento](inventario-de-tratamento.md) e é a base da Política
de Privacidade publicada em `/privacidade`.

| Dado | Finalidade | Hipótese legal | Quem acessa | Compartilhado com | Retenção | Destino |
|---|---|---|---|---|---|---|
| Nome | Identificar o responsável pela atividade e por cada operação | Execução de contrato (art. 7º, V) | Titular, administração e demais autenticados na agenda | Supabase | Enquanto durar o vínculo | Anonimização |
| E-mail institucional | Autenticar e avisar sobre reservas em nome do professor | Execução de contrato (art. 7º, V) | Titular e administração | Supabase, Resend | Enquanto durar o vínculo | Anonimização |
| Senha | Autenticar o acesso | Execução de contrato (art. 7º, V) | Ninguém: armazenada como resumo criptográfico | Supabase | Enquanto a conta existir | Exclusão |
| Segundo fator | Confirmar identidade a cada acesso | Legítimo interesse em segurança (art. 7º, IX) | Ninguém: o segredo não é exibido após o cadastro | Supabase | Enquanto a conta existir | Exclusão |
| Papel no sistema | Decidir o que cada pessoa pode fazer | Execução de contrato (art. 7º, V) | Titular e administração | Supabase | Enquanto durar o vínculo | Mantido, desvinculado |
| Vínculo docente | Validar se a reserva corresponde a atividade que a pessoa leciona | Execução de contrato (art. 7º, V) | Todos os autenticados | Supabase | Período letivo | Mantido |
| Reservas | Gerir ocupação dos espaços e evitar conflitos | Execução de contrato (art. 7º, V) | Todos os autenticados leem; alteram apenas responsável, autor e administração | Supabase, Resend | Indefinida, como registro institucional | Mantidas |
| Registros de auditoria | Rastrear alterações e acessos | Legítimo interesse em rastreabilidade (art. 7º, IX) | Apenas administração | Supabase | Indefinida | Mantidos, autor anonimizado |
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
substituído por "Usuário removido" e o vínculo entre conta e docente é
desfeito. A chave estrangeira `bookings.created_by` usa `on delete restrict`
justamente para que o banco recuse apagar um perfil que responde por reservas,
obrigando o caminho da anonimização.
