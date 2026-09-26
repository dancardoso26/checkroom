alter table public.bookings
  add column if not exists created_by uuid;

-- Remove a chave estrangeira criada pela versão anterior. Se nunca existiu, esta
-- linha não faz nada.
alter table public.bookings
  drop constraint if exists bookings_created_by_fkey;

comment on column public.bookings.created_by is
  'Quem registrou a reserva, que nem sempre é o professor da aula. Passa a referenciar profiles(id) e a ser obrigatória na entrega de 28/09. Nulo nas reservas criadas antes disso.';

-- "reservas que eu registrei" é a base da tela de acompanhamento da secretaria.
create index if not exists bookings_created_by_idx
  on public.bookings (created_by);
