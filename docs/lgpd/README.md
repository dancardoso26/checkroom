# Documentos de LGPD

Os documentos exigidos pelas orientações da disciplina, versionados junto com o
código que eles descrevem. Ficar no repositório é deliberado: a Seção 7 das
orientações diz que a avaliação observa "a coerência entre documentação, banco
de dados, código, interfaces, permissões e comportamento real do sistema".
Lado a lado, uma mudança de permissão e a matriz que a descreve aparecem no
mesmo commit.

| Documento | O que traz |
|---|---|
| [inventario-de-tratamento.md](inventario-de-tratamento.md) | Que dado, de quem, onde é coletado, para quê, onde fica, quem alcança e por quanto tempo. Inclui o diagrama do fluxo |
| [matriz-de-dados.md](matriz-de-dados.md) | Dado, finalidade, hipótese legal, acesso, compartilhamento e retenção, mais a avaliação de legítimo interesse |
| [matriz-de-perfis.md](matriz-de-perfis.md) | O que cada papel pode fazer, e onde cada regra é aplicada |
| [fornecedores.md](fornecedores.md) | Supabase, Resend e Vercel: o que cada um recebe e onde processa |
| [plano-de-retencao.md](plano-de-retencao.md) | Prazos, destinos e como o descarte é executado de fato |

Os dois documentos voltados ao usuário não estão aqui: eles são páginas do
sistema, em `/termos` e `/privacidade`, porque precisam estar onde o aceite
acontece. O código vive em `src/app/(documentos)/`.

## O que esta entrega ainda não cobre

A Seção 6 das orientações lista doze entregáveis. Cinco ficaram para as
entregas seguintes, e é melhor registrar isso do que dar a lista por completa:

- **Diagrama do fluxo de dados** em forma gráfica. O fluxo está descrito em
  texto no inventário, e o Diagrama de Classes e o BPMN vencem em 05/10.
- **Plano de resposta a incidentes** detalhado. O procedimento resumido está na
  seção 8 da Política de Privacidade.
- **Registro das medidas técnicas de segurança** como documento próprio. As
  medidas estão descritas na seção 7 da Política.
- **Procedimento formal de atendimento aos direitos dos titulares**. O direito
  de eliminação já está implementado na tela de conta; acesso e correção
  dependem de canal institucional que um protótipo não tem.
- **Evidências de implementação e teste dos controles**. Existem testes
  automatizados dos controles de autorização, mas o relatório consolidado faz
  sentido quando o sistema estiver completo, em 23/11.
