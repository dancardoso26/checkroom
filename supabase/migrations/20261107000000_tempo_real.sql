do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array['bookings', 'lectures', 'lecture_enrollments', 'tickets'] loop
    if not exists (
      select 1
        from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = v_tabela
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_tabela);
    end if;
  end loop;
end;
$$;
