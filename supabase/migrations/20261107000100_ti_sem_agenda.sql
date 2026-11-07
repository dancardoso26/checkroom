drop policy "agenda visivel conforme o papel" on public.bookings;

create policy "agenda visivel conforme o papel" on public.bookings
  for select to authenticated
  using (
    public.papel_atual() is distinct from 'it_support'
    and (not public.eh_aluno() or class_id = public.turma_atual())
  );

drop policy "palestra visivel a autenticados" on public.lectures;

create policy "palestra visivel fora da TI" on public.lectures
  for select to authenticated
  using (public.papel_atual() is distinct from 'it_support');
