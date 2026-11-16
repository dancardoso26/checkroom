# Documentos de LGPD

Os documentos exigidos pelas orientações da disciplina, versionados junto com o
código que eles descrevem. Ficar no repositório é deliberado: a Seção 7 das
orientações diz que a avaliação observa "a coerência entre documentação, banco
de dados, código, interfaces, permissões e comportamento real do sistema".
Lado a lado, uma mudança de permissão e a matriz que a descreve aparecem no
mesmo commit.

Comece pelo [relatório de validação](relatorio-de-validacao.md), de 12/11/2026:
ele confere cada documento contra o sistema publicado e lista o que ainda não
está conforme.

| # | Entregável (Seção 6) | Documento |
|---|---|---|
| 1 | Política de Privacidade | Página `/privacidade`, em `src/app/(documentos)/privacidade/` |
| 2 | Termos de Uso | Página `/termos`, em `src/app/(documentos)/termos/` |
| 3 | Inventário e diagrama do fluxo | [inventario-de-tratamento.md](inventario-de-tratamento.md) e [fluxo-de-dados.md](fluxo-de-dados.md) |
| 4 | Matriz de dado, finalidade, hipótese legal, acesso, compartilhamento e retenção | [matriz-de-dados.md](matriz-de-dados.md) |
| 5 | Matriz de perfis e permissões | [matriz-de-perfis.md](matriz-de-perfis.md) |
| 6 | Plano de retenção e descarte | [plano-de-retencao.md](plano-de-retencao.md) |
| 7 | Plano de resposta a incidentes | [resposta-a-incidentes.md](resposta-a-incidentes.md) |
| 8 | Fornecedores e APIs externas | [fornecedores.md](fornecedores.md) |
| 9 | Registro das medidas técnicas de segurança | [medidas-de-seguranca.md](medidas-de-seguranca.md) |
| 10 | Atendimento aos direitos dos titulares | [direitos-dos-titulares.md](direitos-dos-titulares.md) |
| 11 | Avaliação de áreas específicas | Não se aplica: ver "Dados sensíveis" no relatório de validação |
| 12 | Evidências de implementação e teste | [evidencias-dos-controles.md](evidencias-dos-controles.md) e o script [evidencias/controles-no-banco.sql](evidencias/controles-no-banco.sql) |

Os dois documentos voltados ao usuário são páginas do sistema, e não arquivos
daqui, porque precisam estar onde o aceite acontece.

## Quando atualizar

Toda mudança que altere quem vê ou faz o quê, que dado é guardado ou para quem
um e-mail vai precisa atualizar, no mesmo commit, a matriz de perfis ou de
dados correspondente. Se a mudança alterar o que a política ou os termos dizem,
a versão em `src/domain/documentos/documentos.ts` sobe, e todos aceitam de novo
no próximo acesso.
