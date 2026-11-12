# Matriz de perfis e permissões

Versão 1.2, de 12/11/2026, revista na validação da entrega de 16/11: TI sem
agenda, aluno restrito à turma, administrador master e gestão de usuários.

O sistema define quatro papéis, alinhados à Seção 5.1 das orientações da
disciplina, que pede separação entre aluno, professor, secretaria e direção.
Entre os administradores, um é o **master**: não pode ser removido, desativado
nem ter o papel trocado, e também atende chamados.

| Operação | Professor | Administração | Aluno | Equipe de TI |
|---|---|---|---|---|
| Entrar no sistema | sim | sim | sim | sim |
| Ver a agenda de reservas | todas | todas | **só a da sua turma** | **não** |
| Criar reserva em nome próprio | sim | sim | não | não |
| Criar reserva em nome de outro professor | **não** | sim | não | não |
| Cancelar ou excluir reserva própria ou que registrou | sim | sim | não | não |
| Cancelar ou excluir reserva de terceiro | **não** | sim | não | não |
| Abrir chamado de suporte | sim | sim | não | não |
| Ver chamados | os próprios | todos | não | todos |
| Assumir, devolver à fila e resolver chamado | **não** | só o master | não | sim |
| Cancelar chamado ainda aberto | o próprio | o próprio | não | não |
| Excluir chamado | não | só o master | não | não |
| Ver palestras | todas | todas | **só as do seu curso** | **não** |
| Cadastrar e excluir palestra | não | sim | não | não |
| Inscrever-se em palestra | não | não | sim, do seu curso | não |
| Ver quem se inscreveu | não | sim | só a própria inscrição | não |
| Manter espaços, recursos, cadastro acadêmico e calendário | não | sim | não | não |
| Consultar o dashboard | não | sim | não | não |
| Ver o log de auditoria | **não** | sim | não | não |
| Convidar, editar, desativar e remover usuários | não | sim, exceto o master | não | não |
| Alterar o próprio papel, curso, turma ou vínculo de professor | **não** | não | **não** | não |
| Cancelar a própria conta | sim | sim, exceto o master | sim | sim |
| Alterar ou apagar registro de auditoria | **não** | **não** | não | não |

A última linha vale para todos, inclusive a administração: a aplicação não expõe
rota de escrita em `audit_logs`, e o único caminho de gravação é a trigger do
banco.

## Onde cada regra é aplicada

Toda linha da tabela existe em dois lugares independentes, e eles precisam dizer
a mesma coisa.

**No banco**, por políticas de Row Level Security, triggers e funções, todas
reunidas por assunto em `supabase/estado-atual/`. É a garantia: vale mesmo que
alguém chame a API diretamente, sem passar pela tela. O script
[evidencias/controles-no-banco.sql](evidencias/controles-no-banco.sql) faz
exatamente isso para os quatro papéis.

**Na aplicação**, em `src/domain/auth/permissoes.ts`. É a mensagem: permite
dizer "esta reserva é de outro professor" em vez de devolver uma lista vazia
que pareceria ausência de dados.

A Seção 4.3 das orientações é explícita: "esconder botões no frontend não é
controle de acesso". Por isso o campo de professor sumir do formulário para
quem é professor **não é** a proteção. A proteção é a Server Action recusar o
pedido e a política do banco recusar a escrita. O campo escondido é
conveniência de interface; a verificação que vale está em
`src/domain/auth/permissoes.ts` e na política "cria a propria reserva".

## Verificação por papel

Os casos da matriz estão cobertos pelo script de evidências citado acima, por
testes em
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
