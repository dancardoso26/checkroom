# Plano de retenção e descarte

Versão 1.1, de 12/11/2026, revista na validação da entrega de 16/11: prazos
unificados com a Política de Privacidade publicada, chamados e inscrições
incluídos. Segue o formato da Seção 4.6 das orientações da disciplina, que
exige prazo ou critério verificável e implementação do descarte prometido.

| Categoria | Finalidade | Prazo ou critério | Destino | Quem executa |
|---|---|---|---|---|
| Conta e perfil | Autenticação e identificação | Enquanto a conta existir | Anonimização | O titular (Minha conta) ou a administração (Usuários) |
| Senha e segundo fator | Autenticação | Enquanto a conta existir | Conta bloqueada na anonimização | Sistema |
| Vínculo de professor | Validar a reserva contra a disciplina e a turma | Período letivo | Desfeito na anonimização; novos vínculos a cada período | Administração |
| Reservas | Registro de uso dos espaços | Até o fim do projeto acadêmico | Futuras canceladas e passadas sem ligação com a pessoa na anonimização; excluídas no fim do projeto | Sistema e autor |
| Inscrições em palestras | Controlar as vagas | Até o fim do projeto acadêmico | As de palestras futuras apagadas na anonimização | Sistema |
| Chamados | Histórico de manutenção dos espaços | Até o fim do projeto acadêmico | Os abertos cancelados na anonimização | Sistema |
| Registros de auditoria | Rastreabilidade das operações | Até o fim do projeto acadêmico | E-mail da pessoa apagado na anonimização; excluídos no fim do projeto | Sistema e autor |
| Registros de acesso | Segurança das contas | Retenção do Supabase Auth, limitada ao fim do projeto | Excluídos com o projeto | Autor |
| Cookies de sessão | Manter a autenticação entre requisições | Duração da sessão | Expiram ou são apagados ao sair | Navegador |
| Dados de demonstração | Testes acadêmicos | Até o fim do projeto acadêmico | Excluídos com o projeto | Autor |

"Fim do projeto acadêmico" é verificável: é o lançamento do conceito final da
disciplina, previsto para 17/12/2026 no plano de ensino. Depois dele, o
projeto do Supabase é excluído, o que apaga banco, contas e registros de
acesso, e com eles qualquer cópia mantida pelo fornecedor.

## O que "anonimização" faz, concretamente

Não é promessa de tela. É a função `anonimizar_perfil()`, em
`supabase/estado-atual/usuarios-e-permissoes.sql`, chamada por
`anonimizar_conta()` (o titular) ou por `remover_usuario()` (a administração).
Numa transação, ela:

1. cancela as reservas futuras da pessoa, com o motivo "Conta removida";
2. troca o nome no perfil por "Usuário removido", desfaz o vínculo de
   professor, o curso e a turma, e marca a data da anonimização;
3. anonimiza o cadastro de professor ligado à conta;
4. apaga o e-mail da pessoa dos registros de auditoria;
5. grava o próprio evento na auditoria.

A marcação da data dispara a trigger `profiles_libera_pendencias`, que apaga as
inscrições em palestras futuras e cancela os chamados ainda abertos. Em
seguida, a aplicação troca o e-mail em `auth.users` por um endereço
`@checkroom.invalid` e bloqueia a conta, encerrando o acesso.

## Por que a conta não é apagada de fato

A chave estrangeira `bookings.created_by` usa `on delete restrict`. O banco
recusa apagar um perfil que responde por reservas, e essa recusa é intencional:
apagar a linha levaria junto a autoria das reservas passadas e o vínculo dos
eventos de auditoria, esvaziando os dois registros que a instituição tem
interesse legítimo em preservar.

A alternativa seria apagar também as reservas, o que destruiria o histórico de
uso dos espaços por decisão de uma pessoa. O caminho escolhido preserva o
registro institucional e elimina o dado pessoal, que é o que a lei pede.

## Exclusão no fim do projeto

A exclusão do projeto do Supabase é o descarte final. Como ele também apaga as
cópias do fornecedor, não há dado pessoal guardado depois do prazo prometido.
O repositório não guarda dado pessoal: o `seed.sql` só tem nomes e e-mails
fictícios.
