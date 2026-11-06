alter table public.profiles disable trigger profiles_protege_papel;

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

delete from auth.users where email = 'teste.mfa@exemplo.edu.br';

create unique index profiles_administrador_unico
  on public.profiles ((true))
  where role = 'admin';

comment on index public.profiles_administrador_unico is
  'Garante no máximo um administrador. Promover outra conta exige antes rebaixar a atual.';
