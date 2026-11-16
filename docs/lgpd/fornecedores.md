# Fornecedores e APIs externas

Versão 1.1, de 12/11/2026, revista com o site publicado. Exigido pela Seção 2.4 das orientações da
disciplina, que pede identificar cada terceiro, a finalidade e os dados
enviados.

| Fornecedor | Papel | Dados que recebe | Onde processa |
|---|---|---|---|
| Supabase | Banco de dados e autenticação | Todos os dados do inventário | São Paulo, Brasil |
| Resend | Entrega de e-mail transacional, a partir do domínio `checkroom.com.br` | Nome e endereço do destinatário e o conteúdo da mensagem | São Paulo, Brasil |
| Vercel | Hospedagem da aplicação, em [https://checkroom.com.br](https://checkroom.com.br) | Dados que trafegam nas requisições | São Paulo, Brasil (`gru1`) |

## Supabase

Guarda o banco PostgreSQL e o serviço de autenticação. É o único fornecedor que
alcança o conjunto completo de dados, incluindo o resumo criptográfico das
senhas e os segredos de segundo fator, que ele próprio gera e verifica.

A instância está na região `sa-east-1`. O acesso da aplicação usa duas chaves
com alcances diferentes. A publicável respeita as políticas de RLS e é a usada
nas operações feitas em nome de quem está logado. A secreta ignora as
políticas e fica só no servidor, para o que a sessão não alcança por desenho:
o registro de eventos de autenticação, que acontece antes de haver sessão; a
gestão de contas (convite, desativação, remoção); e as leituras que precisam
de dado que o RLS esconde de quem pede, como o e-mail do destinatário de um
aviso, o nome de quem abriu um chamado e as contagens do dashboard. Toda
função que usa a chave secreta é chamada depois de uma verificação de papel na
Server Action.

## Resend

Entrega os avisos do sistema: reserva nova, cancelada ou removida; palestra
nova ou cancelada, e o aviso ao palestrante; e chamado resolvido. Também é o
SMTP do Supabase Auth, por onde saem o convite e a recuperação de senha. Recebe
apenas o necessário para compor e endereçar a mensagem, conforme o princípio da
necessidade: nome e e-mail do destinatário e os dados que a mensagem cita. No
aviso de palestra nova, cada aluno recebe a própria mensagem, sem ver o
endereço dos demais.

Não recebe senha, papel, vínculo de professor nem qualquer registro de auditoria. O
rastreamento de abertura e de cliques está desligado.

O domínio `checkroom.com.br` está verificado no Resend, com os registros de
autenticação de remetente no DNS. O domínio ainda não recebe e-mail (achado A1
do [relatório de validação](relatorio-de-validacao.md)).

## Vercel

Hospeda a aplicação desde 06/11/2026. As funções rodam em São Paulo (`gru1`),
a mesma região do Supabase, então a requisição do usuário é processada no
Brasil. A Vercel não guarda os dados das requisições: as funções não gravam em
disco e os logs de execução registram só erros, sem o corpo das requisições.
O plano gratuito (Hobby) é restrito a uso não comercial, o que vale para um
protótipo acadêmico.

## Credenciais

As chaves dos três serviços vivem em variáveis de ambiente do servidor, nunca
em código. O arquivo `.env.local` está no `.gitignore`; o que o repositório
guarda é o `.env.example`, com os nomes das variáveis e nenhum valor.

Apenas variáveis prefixadas com `NEXT_PUBLIC_` chegam ao navegador, e são duas:
a URL do projeto e a chave publicável, ambas desenhadas para serem públicas e
inúteis sem uma sessão válida e sem políticas que permitam o acesso.

## Inteligência artificial

Nenhum dado pessoal é enviado a serviço de inteligência artificial. O sistema
não possui funcionalidade que use modelos de linguagem em tempo de execução.
