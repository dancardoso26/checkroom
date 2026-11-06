# Matriz de perfis e permissões

Versão 1.1, de 12/10/2026.

O sistema define quatro papéis, alinhados à Seção 5.1 das orientações da
disciplina, que pede separação entre aluno, professor, secretaria e direção.
Os quatro têm uso: `student` com as palestras e `it_support` com os chamados
de suporte.

| Operação | Professor | Administração | Aluno | Equipe de TI |
|---|---|---|---|---|
| Entrar no sistema | sim | sim | sim | sim |
| Ver a agenda de reservas | sim | sim | sim | sim |
| Criar reserva em nome próprio | sim | sim | não | não |
| Criar reserva em nome de outro professor | **não** | sim | não | não |
| Cancelar reserva própria ou que registrou | sim | sim | não | não |
| Cancelar reserva de terceiro | **não** | sim | não | não |
| Excluir reserva própria ou que registrou | sim | sim | não | não |
| Excluir reserva de terceiro | **não** | sim | não | não |
| Ver a trilha de auditoria | **não** | sim | não | não |
| Alterar o próprio papel ou vínculo de professor | **não** | não | não | não |
| Alterar papel de outra pessoa | não | sim | não | não |
| Encerrar a própria conta | sim | sim | sim | sim |
| Abrir chamado de suporte | sim | sim | não | não |
| Ver chamados | os próprios | todos | não | todos |
| Assumir e resolver chamado | **não** | **não** | não | sim |
| Cancelar chamado ainda aberto | o próprio | o próprio | não | não |
| Ver palestras | todas | todas | as do seu curso | só na agenda |
| Cadastrar e excluir palestra | não | sim | não | não |
| Inscrever-se em palestra | não | não | sim, do seu curso | não |
| Ver quem se inscreveu | não | sim | só a própria inscrição | não |
| Manter espaços, recursos, cadastro acadêmico e calendário | não | sim | não | não |
| Consultar o painel de métricas | não | sim | não | não |
| Alterar o próprio curso | não | não | **não** | não |
| Alterar ou apagar registro de auditoria | **não** | **não** | não | não |

A última linha vale para todos, inclusive a administração: a aplicação não expõe
rota de escrita em `audit_logs`, e o único caminho de gravação é a trigger do
banco.

## Onde cada regra é aplicada

Toda linha da tabela existe em dois lugares independentes, e eles precisam dizer
a mesma coisa.

**No banco**, por políticas de Row Level Security, em
`supabase/migrations/20260922000300_row_level_security_policies.sql` e nas
migrations de cadastros, chamados, palestras e calendário. É a
garantia: vale mesmo que alguém chame o endpoint diretamente, sem passar pela
tela.

**Na aplicação**, em `src/domain/auth/permissoes.ts`. É a mensagem: permite
dizer "esta reserva é de outro professor" em vez de devolver uma lista vazia
que pareceria ausência de dados.

A Seção 4.3 das orientações é explícita: "esconder botões no frontend não é
controle de acesso". Por isso o campo de professor sumir do formulário para
quem é professor **não é** a proteção. A proteção é a Server Action recusar o
pedido e a política do banco recusar a escrita. O campo escondido é
conveniência de interface, e o código registra isso em comentário no ponto
exato onde a verificação acontece.

## Verificação por papel

Os casos da matriz estão cobertos por testes em
`src/domain/auth/permissoes.test.ts`, que exercita a decisão como função pura,
e pelos testes de ponta a ponta, que exercitam o caminho completo pela
interface e pelo banco.

Um caso merece destaque porque é fácil de errar: dois perfis **sem** vínculo
professor não podem ser tratados como donos das reservas um do outro. Se a
comparação fosse apenas `professorId === professorId`, dois valores nulos
seriam considerados iguais e qualquer pessoa sem vínculo gerenciaria reservas
alheias. Há teste específico para isso.

Dois casos dos módulos novos seguem o mesmo princípio. A TI não altera a
situação de um chamado por `update`: não há política de escrita em `tickets`
além da abertura, e as transições passam por funções do banco que conferem o
papel e a situação atual juntos. E o aluno não vê quem mais se inscreveu numa
palestra: a contagem de vagas vem de uma função que só devolve números.
