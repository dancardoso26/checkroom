-- O papel authenticated não tinha privilégio nenhum: só service_role recebeu na
-- migration de grants. Sem isto, nenhuma política chega a ser avaliada.
grant usage on schema public to authenticated;

grant select on
  public.courses, public.professors, public.classes, public.rooms,
  public.resources, public.room_resources, public.subjects,
  public.teaching_assignments, public.profiles, public.audit_logs
  to authenticated;

grant select, insert, update, delete on
  public.bookings, public.booking_resources to authenticated;

grant update on public.profiles to authenticated;

grant execute on function public.create_booking(
  uuid, uuid, uuid, text, timestamptz, timestamptz, uuid[], uuid,
  public.activity_type, uuid
) to authenticated;

grant execute on function public.cancel_booking(uuid, text) to authenticated;

-- Consultadas dentro das políticas. security definer para poderem ler profiles
-- sem cair na política de profiles, o que seria recursão infinita.
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'admin'
  );
$$;

-- O professor vinculado à conta de quem está pedindo. Nulo para quem não
-- leciona, e é o que impede um professor de reservar em nome de outro.
create or replace function public.professor_atual()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select professor_id from public.profiles where id = auth.uid();
$$;

-- CATÁLOGOS
--
-- Leitura livre entre autenticados: a grade de ocupação só faz sentido se todos
-- enxergarem salas, turmas e professores. Escrita é privilégio da administração
-- e ainda não tem tela, então nenhuma política de insert é criada aqui.

create policy "catalogo visivel a autenticados" on public.courses
  for select to authenticated using (true);

create policy "catalogo visivel a autenticados" on public.professors
  for select to authenticated using (true);

create policy "catalogo visivel a autenticados" on public.classes
  for select to authenticated using (true);

create policy "catalogo visivel a autenticados" on public.rooms
  for select to authenticated using (true);

create policy "catalogo visivel a autenticados" on public.resources
  for select to authenticated using (true);

create policy "catalogo visivel a autenticados" on public.room_resources
  for select to authenticated using (true);

create policy "catalogo visivel a autenticados" on public.subjects
  for select to authenticated using (true);

create policy "catalogo visivel a autenticados" on public.teaching_assignments
  for select to authenticated using (true);

-- PERFIS
--
-- Cada um enxerga o próprio perfil; a administração enxerga todos, porque
-- precisa saber em nome de quem está reservando.

create policy "perfil proprio ou admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.eh_admin());

-- Sem cláusula de papel: quem edita o próprio perfil não pode se promover a
-- admin, e o check de papel fica na trigger abaixo.
create policy "edita o proprio perfil" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.impedir_troca_de_papel()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.role is distinct from old.role and not public.eh_admin() then
    raise exception 'Apenas a administração altera o papel de um usuário.';
  end if;

  if new.professor_id is distinct from old.professor_id and not public.eh_admin() then
    raise exception 'Apenas a administração altera o vínculo docente.';
  end if;

  return new;
end;
$$;

create trigger profiles_protege_papel
  before update on public.profiles
  for each row
  execute function public.impedir_troca_de_papel();

-- RESERVAS
--
-- Todos leem a agenda inteira: uma sala ocupada precisa aparecer ocupada para
-- quem tenta reservá-la, mesmo que a reserva seja de outra pessoa.

create policy "agenda visivel a autenticados" on public.bookings
  for select to authenticated using (true);

-- Professor cria em nome de si mesmo. A administração cria em nome de
-- qualquer um, que é a secretaria registrando pelo docente.
create policy "cria a propria reserva" on public.bookings
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (public.eh_admin() or professor_id = public.professor_atual())
  );

create policy "altera a propria reserva" on public.bookings
  for update to authenticated
  using (
    public.eh_admin()
    or created_by = auth.uid()
    or professor_id = public.professor_atual()
  )
  with check (
    public.eh_admin()
    or created_by = auth.uid()
    or professor_id = public.professor_atual()
  );

create policy "exclui a propria reserva" on public.bookings
  for delete to authenticated
  using (
    public.eh_admin()
    or created_by = auth.uid()
    or professor_id = public.professor_atual()
  );

-- Os recursos acompanham a reserva: quem pode mexer nela pode mexer neles.
create policy "recursos seguem a reserva" on public.booking_resources
  for select to authenticated using (true);

create policy "recursos seguem a reserva na escrita" on public.booking_resources
  for insert to authenticated
  with check (
    exists (
      select 1 from public.bookings b
       where b.id = booking_id
         and (
           public.eh_admin()
           or b.created_by = auth.uid()
           or b.professor_id = public.professor_atual()
         )
    )
  );

create policy "recursos seguem a reserva na remocao" on public.booking_resources
  for delete to authenticated
  using (
    exists (
      select 1 from public.bookings b
       where b.id = booking_id
         and (
           public.eh_admin()
           or b.created_by = auth.uid()
           or b.professor_id = public.professor_atual()
         )
    )
  );

-- AUDITORIA
--
-- Só a administração lê, e ninguém escreve pela aplicação: o único caminho de
-- escrita é a trigger, que é security definer e não passa por política.

create policy "auditoria visivel a admin" on public.audit_logs
  for select to authenticated
  using (public.eh_admin());
