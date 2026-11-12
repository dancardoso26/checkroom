# Procedimento de atendimento aos direitos dos titulares

Versão 1.0, de 12/11/2026. Atende ao item 10 da Seção 6 e à Seção 2.7 das
orientações da disciplina, que avisa: "o canal precisa funcionar".

## Canais

| Canal | Para quê |
|---|---|
| Tela Minha conta (`/conta`) | Acesso aos próprios dados e eliminação, sem depender de ninguém |
| Administração do sistema | Correção de nome, curso, turma e vínculo de professor |
| E-mail publicado na Política de Privacidade | Todo o resto, e qualquer pedido de quem não consegue mais entrar |

Prazo de resposta: até 15 dias, o mesmo que a LGPD (art. 19, II) dá para a
declaração completa e que a política promete.

## Antes de atender: confirmar a identidade

Pedido feito pela tela já vem autenticado, com senha e segundo fator. Pedido
por e-mail só é atendido se vier do endereço cadastrado na conta, ou depois de
confirmar a pessoa pela administração. Isso impede que alguém peça os dados ou
a eliminação da conta de outra pessoa.

## Como cada direito é atendido

| Direito (LGPD, art. 18) | Como | Quem executa | Implementado em |
|---|---|---|---|
| Confirmação e acesso | Minha conta mostra nome, perfil, data e versão do aceite e o segundo fator. O restante (e-mail, curso, turma, reservas, inscrições, chamados) a pessoa vê nas próprias telas; a cópia completa sai pela consulta abaixo | Titular; administração pela consulta | `src/app/(sistema)/conta/page.tsx` |
| Correção | Nome, curso, turma e papel são dados institucionais: a administração corrige em Configurações, Usuários. A mudança fica na auditoria | Administração | `alterar_papel` e trigger `impedir_troca_de_papel` |
| Anonimização ou eliminação | Botão Cancelar conta, em Minha conta. Executa na hora, sem pedido a ninguém | Titular | `anonimizar_conta()` e `src/app/(sistema)/conta/acoes.ts` |
| Portabilidade | Cópia dos dados em JSON, pela consulta abaixo, enviada ao titular | Administração | Consulta deste documento |
| Informação sobre compartilhamento | Já respondida na Política de Privacidade, seção "Com quem os dados são compartilhados" | Não se aplica | `/privacidade` |
| Revogação do consentimento | Nenhum tratamento se apoia em consentimento; ver a [matriz de dados](matriz-de-dados.md) | Não se aplica | Não se aplica |
| Oposição | Os tratamentos por legítimo interesse (segurança e auditoria) são a condição de uso seguro do sistema; quem se opuser pode encerrar a conta | Titular | Mesmo botão Cancelar conta |
| Revisão de decisão automatizada | O sistema sugere o espaço, mas quem reserva escolhe; não há decisão automatizada sobre pessoas (art. 20) | Não se aplica | Política, seção "Seus direitos" |

## O que a eliminação faz e o que não faz

Faz, numa transação no banco (`anonimizar_perfil`) seguida do bloqueio no
Supabase Auth:

1. troca o nome por "Usuário removido" e desfaz o vínculo de professor e o
   curso e a turma do aluno;
2. anonimiza o cadastro de professor ligado à conta;
3. apaga o e-mail da pessoa dos registros de auditoria;
4. cancela as reservas futuras, remove as inscrições em palestras futuras e
   cancela os chamados ainda abertos;
5. troca o e-mail da conta por um endereço `@checkroom.invalid` e bloqueia o
   acesso;
6. grava `account_anonymized` (ou `user_removed`, quando é a administração) na
   auditoria.

Não apaga as reservas passadas nem os registros de auditoria, que documentam o
uso dos espaços. Eles continuam existindo sem nada que identifique a pessoa. A
justificativa está na [matriz de dados](matriz-de-dados.md), seção "Sobre o que
não é apagado".

## Consulta para acesso e portabilidade

Rodada pela administração no SQL Editor, trocando o e-mail. Devolve um único
JSON com tudo o que o sistema guarda da pessoa.

```sql
with titular as (
  select u.id, u.email, u.created_at, u.last_sign_in_at
    from auth.users u
   where lower(u.email) = lower('pessoa@exemplo.edu.br')
)
select jsonb_pretty(jsonb_build_object(
  'conta', (select to_jsonb(t) from titular t),
  'perfil', (select jsonb_build_object(
      'nome', p.full_name, 'papel', p.role,
      'curso', c.name, 'turma', cl.name,
      'termos', p.terms_version, 'aceite_em', p.terms_accepted_at)
    from public.profiles p
    left join public.courses c on c.id = p.course_id
    left join public.classes cl on cl.id = p.class_id
   where p.id = (select id from titular)),
  'reservas', (select coalesce(jsonb_agg(jsonb_build_object(
      'inicio', b.starts_at, 'fim', b.ends_at, 'finalidade', b.purpose,
      'situacao', b.status) order by b.starts_at), '[]'::jsonb)
    from public.bookings b
    left join public.profiles p on p.id = (select id from titular)
   where b.created_by = (select id from titular)
      or b.professor_id = p.professor_id),
  'inscricoes', (select coalesce(jsonb_agg(jsonb_build_object(
      'palestra', l.title, 'inicio', l.starts_at, 'inscrito_em', e.enrolled_at)), '[]'::jsonb)
    from public.lecture_enrollments e
    join public.lectures l on l.id = e.lecture_id
   where e.profile_id = (select id from titular)),
  'chamados', (select coalesce(jsonb_agg(jsonb_build_object(
      'aberto_em', tk.created_at, 'descricao', tk.description,
      'situacao', tk.status)), '[]'::jsonb)
    from public.tickets tk
   where tk.requested_by = (select id from titular)),
  'eventos_de_acesso', (select coalesce(jsonb_agg(jsonb_build_object(
      'quando', a.occurred_at, 'acao', a.action) order by a.occurred_at), '[]'::jsonb)
    from public.audit_logs a
   where a.actor_id = (select id from titular) and a.entity = 'auth')
)) as dados_do_titular;
```

## Registro dos atendimentos

A Seção 4.5 das orientações pede registrar o atendimento das solicitações. A
eliminação se registra sozinha na auditoria. Os pedidos que chegam por e-mail
ficam registrados na própria caixa do canal, com a data do pedido, a data da
resposta e o que foi feito. O registro não vai para o repositório, porque
contém dados pessoais.
