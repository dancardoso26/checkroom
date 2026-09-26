# Fornecedores e APIs externas

Versão 1.0, de 22/09/2026. Exigido pela Seção 2.4 das orientações da
disciplina, que pede identificar cada terceiro, a finalidade e os dados
enviados.

| Fornecedor | Papel | Dados que recebe | Onde processa |
|---|---|---|---|
| Supabase | Banco de dados e autenticação | Todos os dados do inventário | São Paulo, Brasil |
| Resend | Entrega de e-mail transacional | Nome e endereço do destinatário, e os dados da reserva citada na mensagem | São Paulo, Brasil |
| Vercel | Hospedagem da aplicação | Dados que trafegam nas requisições | A definir na publicação |

## Supabase

Guarda o banco PostgreSQL e o serviço de autenticação. É o único fornecedor que
alcança o conjunto completo de dados, incluindo o resumo criptográfico das
senhas e os segredos de segundo fator, que ele próprio gera e verifica.

A instância está na região `sa-east-1`. O acesso da aplicação usa duas chaves
com alcances diferentes: a publicável, que respeita as políticas de RLS e é a
usada em todas as operações com sessão, e a secreta, que as ignora e fica
restrita ao script de criação de contas e ao registro de eventos de
autenticação, que ocorrem antes de haver sessão.

## Resend

Entrega os avisos de reserva criada e cancelada. Recebe apenas o necessário
para compor e endereçar a mensagem, conforme o princípio da necessidade: nome
e e-mail do destinatário, e os dados da reserva que a mensagem cita.

Não recebe senha, papel, vínculo docente nem qualquer registro de auditoria. O
rastreamento de abertura e de cliques está desligado.

Enquanto não houver domínio próprio verificado, o sistema usa o remetente de
teste do serviço, que entrega apenas no endereço dono da conta. É limitação
assumida do ambiente de demonstração.

## Vercel

Hospedará a aplicação. Até 28/09/2026 o sistema roda apenas em ambiente local,
então nenhum dado foi enviado a esse fornecedor. Quando a publicação ocorrer,
esta seção precisa registrar a região escolhida, e a Política de Privacidade,
a possibilidade de processamento fora do Brasil.

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
