create table public.academic_terms (
  id uuid primary key default gen_random_uuid(),

  code text not null unique check (code ~ '^\d{4}\.[12]$'),
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),

  constraint academic_terms_period_valid check (ends_on > starts_on),

  constraint academic_terms_no_overlap
    exclude using gist (daterange(starts_on, ends_on, '[]') with &&)
);

create table public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  starts_on date not null,
  ends_on date not null,

  room_id uuid references public.rooms (id) on delete restrict,

  reason text not null check (length(trim(reason)) between 1 and 200),
  created_at timestamptz not null default now(),

  constraint calendar_blocks_period_valid check (ends_on >= starts_on)
);

create index calendar_blocks_dates_idx on public.calendar_blocks (starts_on, ends_on);
create index calendar_blocks_room_id_idx on public.calendar_blocks (room_id);

alter table public.academic_terms enable row level security;
alter table public.calendar_blocks enable row level security;

grant select, insert, update, delete on
  public.academic_terms, public.calendar_blocks to authenticated;

create policy "calendario visivel a autenticados" on public.academic_terms
  for select to authenticated using (true);
create policy "admin cadastra" on public.academic_terms
  for insert to authenticated with check (public.eh_admin());
create policy "admin altera" on public.academic_terms
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "admin exclui" on public.academic_terms
  for delete to authenticated using (public.eh_admin());

create policy "calendario visivel a autenticados" on public.calendar_blocks
  for select to authenticated using (true);
create policy "admin cadastra" on public.calendar_blocks
  for insert to authenticated with check (public.eh_admin());
create policy "admin altera" on public.calendar_blocks
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "admin exclui" on public.calendar_blocks
  for delete to authenticated using (public.eh_admin());

create trigger academic_terms_audit
  after insert or update or delete on public.academic_terms
  for each row execute function public.log_audit_event();

create trigger calendar_blocks_audit
  after insert or update or delete on public.calendar_blocks
  for each row execute function public.log_audit_event();
