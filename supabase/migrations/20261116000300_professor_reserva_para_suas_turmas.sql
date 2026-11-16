alter policy "cria a propria reserva" on public.bookings
  with check (
    created_by = (select auth.uid())
    and (
      public.eh_admin()
      or (
        professor_id = public.professor_atual()
        and public.leciona_na_turma(class_id, starts_at)
      )
    )
  );
