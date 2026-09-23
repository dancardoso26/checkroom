# Plano de retenção e descarte

Versão 1.0, de 22/09/2026. Segue o formato da Seção 4.6 das orientações da
disciplina, que exige prazo ou critério verificável e implementação do descarte
prometido.

| Categoria | Finalidade | Prazo ou critério | Destino | Quem executa |
|---|---|---|---|---|
| Conta e perfil | Autenticação e identificação | Enquanto durar o vínculo com a instituição, ou até pedido do titular | Anonimização | O próprio titular, pela tela de conta |
| Senha e segundo fator | Autenticação | Enquanto a conta estiver ativa | Exclusão ao encerrar a conta | Sistema |
| Vínculo docente | Validar a reserva contra a disciplina e a turma | Período letivo vigente | Substituído a cada novo período | Administração |
| Reservas | Registro institucional de uso dos espaços | Indefinido | Mantidas, sem vínculo com a pessoa após a anonimização | Não se aplica |
| Registros de auditoria | Rastreabilidade das operações | Indefinido | Mantidos, com autor anonimizado | Não se aplica |
| Cookies de sessão | Manter a autenticação entre requisições | Duração da sessão | Expiram sozinhos | Navegador |
| Dados de demonstração | Testes acadêmicos | Até a conclusão do projeto | Excluídos com o projeto | Autor |

## O que "anonimização" faz, concretamente

Não é promessa de tela. É a função `anonimizar_conta()`, em
`supabase/migrations/20260922000400_anonimizar_conta.sql`, que executa três
coisas numa transação:

1. cancela as reservas futuras da pessoa, com o motivo registrado;
2. substitui o nome no perfil por "Usuário removido" e desfaz o vínculo
   docente, marcando a data da anonimização;
3. grava o próprio evento na trilha de auditoria.

Em seguida, a aplicação troca o endereço de e-mail em `auth.users` por um valor
sem correspondência real e bloqueia a conta, encerrando o acesso.

## Por que a conta não é apagada de fato

A chave estrangeira `bookings.created_by` usa `on delete restrict`. O banco
recusa apagar um perfil que responde por reservas, e essa recusa é intencional:
apagar a linha levaria junto a autoria das reservas passadas e o vínculo dos
eventos de auditoria, esvaziando os dois registros que a instituição tem
interesse legítimo em preservar.

A alternativa seria apagar também as reservas, o que destruiria o histórico de
uso dos espaços por decisão de uma pessoa. O caminho escolhido preserva o
registro institucional e elimina o dado pessoal, que é o que a lei pede.

## O que ainda não tem prazo definido

"Indefinido" aparece duas vezes na tabela, e é uma lacuna consciente. Reservas
e auditoria seriam retidas, numa implantação real, pelo prazo que a instituição
definisse em sua política de arquivo, provavelmente ligado ao prazo de guarda de
registros acadêmicos. Como o CheckRoom é protótipo e não há instituição
controladora, não há como fixar esse prazo aqui sem inventá-lo.
