-- Um único administrador no sistema. As demais contas com esse papel passam a
-- professor: quem coordena não gerencia usuários nem lê a auditoria.

-- Sem sessão, eh_admin() é falso e a trigger recusaria a troca de papel. Ela
-- protege quem edita o próprio perfil, e não uma migration rodada pelo dono.
alter table public.profiles disable trigger profiles_protege_papel;

-- Fica o dev.admin; sem ele, o administrador mais antigo.
with mantido as (
  select p.id
    from public.profiles p
    left join auth.users u on u.id = p.id
   where p.role = 'admin'
   order by (u.email = 'dev.admin@exemplo.edu.br') desc nulls last, p.created_at, p.id
   limit 1
)
update public.profiles
   set role = 'professor'
 where role = 'admin'
   and id not in (select id from mantido);

alter table public.profiles enable trigger profiles_protege_papel;

-- A conta de teste do segundo fator agora nasce e morre com a suíte.
delete from auth.users where email = 'teste.mfa@exemplo.edu.br';

-- Índice único parcial: só a linha com papel admin entra, e com a mesma chave
-- constante, uma segunda é recusada pelo banco.
create unique index profiles_administrador_unico
  on public.profiles ((true))
  where role = 'admin';

comment on index public.profiles_administrador_unico is
  'Garante no máximo um administrador. Promover outra conta exige antes rebaixar a atual.';
