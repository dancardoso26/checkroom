-- Os quatro papéis da ficha. Só professor e admin têm uso nesta entrega; student
-- e it_support entram com palestras e chamados, no ciclo 2.
create type public.user_role as enum (
  'student',
  'professor',
  'it_support',
  'admin'
);

-- profiles é a conta de acesso; professors é o registro institucional do
-- docente. Excluir a conta não remove o professor do quadro.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'professor',
  full_name text not null,

  -- Nulo para quem não leciona, como a administração.
  professor_id uuid unique references public.professors (id) on delete set null,

  terms_accepted_at timestamptz,
  terms_version text,
  anonymized_at timestamptz,
  created_at timestamptz not null default now()
);

-- O e-mail não é copiado para cá: já existe em auth.users e em professors, e
-- duplicá-lo contraria a minimização exigida pela LGPD.
comment on table public.profiles is
  'Conta de acesso ao CheckRoom, vinculada a auth.users. O papel define o que o usuário pode fazer.';

create index profiles_role_idx on public.profiles (role);

alter table public.profiles enable row level security;

-- Toda conta nasce com profile. Sem isso, um usuário criado pelo painel ficaria
-- autenticado e sem papel, num estado que nenhuma tela sabe tratar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, role, full_name, professor_id)
  values (
    new.id,
    coalesce(
      (new.raw_user_meta_data ->> 'role')::public.user_role,
      'professor'
    ),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    (new.raw_user_meta_data ->> 'professor_id')::uuid
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
