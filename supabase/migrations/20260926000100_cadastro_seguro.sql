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
      (new.raw_app_meta_data ->> 'role')::public.user_role,
      'student'
    ),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    (new.raw_app_meta_data ->> 'professor_id')::uuid
  );

  return new;
end;
$$;

revoke select on public.professors from authenticated;
grant select (id, name, created_at) on public.professors to authenticated;
