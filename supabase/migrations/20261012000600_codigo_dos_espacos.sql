alter table public.rooms
  add column building_number smallint,
  add column floor text,
  add column room_number smallint;

with numerados as (
  select id,
         dense_rank() over (order by building) as predio,
         row_number() over (partition by building order by name) as sala
    from public.rooms
)
update public.rooms r
   set building_number = n.predio,
       floor = 'T',
       room_number = n.sala
  from numerados n
 where n.id = r.id;

alter table public.rooms
  alter column building_number set not null,
  alter column floor set not null,
  alter column room_number set not null,
  add constraint rooms_building_number_check check (building_number between 1 and 99),
  add constraint rooms_floor_check check (floor ~ '^(S|T|[1-9])$'),
  add constraint rooms_room_number_check check (room_number between 1 and 999);

alter table public.rooms drop column name, drop column building;

alter table public.rooms
  add column name text generated always as (
    building_number::text || floor || '-' || lpad(room_number::text, 2, '0')
  ) stored,
  add column building text generated always as (
    'Prédio ' || building_number::text
  ) stored,
  add constraint rooms_code_unique unique (building_number, floor, room_number);

comment on column public.rooms.name is
  'Código do espaço, como 3T-12. Calculado a partir de prédio, andar e sala.';

drop function if exists public.salvar_espaco(uuid, text, text, integer, public.room_type, uuid[]);

create or replace function public.salvar_espaco(
  p_id uuid,
  p_predio smallint,
  p_andar text,
  p_sala smallint,
  p_capacidade integer,
  p_tipo public.room_type,
  p_recursos uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid := p_id;
  v_antes uuid[];
  v_depois uuid[] := array(
    select distinct unnest(coalesce(p_recursos, array[]::uuid[])) order by 1
  );
begin
  if not public.eh_admin() then
    raise exception 'Apenas a administração cadastra espaços.';
  end if;

  if v_id is null then
    insert into public.rooms (building_number, floor, room_number, capacity, room_type)
    values (p_predio, upper(p_andar), p_sala, p_capacidade, p_tipo)
    returning id into v_id;

    v_antes := array[]::uuid[];
  else
    update public.rooms
       set building_number = p_predio,
           floor = upper(p_andar),
           room_number = p_sala,
           capacity = p_capacidade,
           room_type = p_tipo
     where id = v_id;

    if not found then
      raise exception 'Espaço não encontrado.';
    end if;

    v_antes := array(
      select resource_id from public.room_resources where room_id = v_id order by 1
    );
  end if;

  delete from public.room_resources
   where room_id = v_id and not (resource_id = any (v_depois));

  insert into public.room_resources (room_id, resource_id)
  select v_id, unnest(v_depois)
  on conflict do nothing;

  if v_antes is distinct from v_depois and p_id is not null then
    insert into public.audit_logs (actor_id, action, entity, entity_id, before_state, after_state)
    values (
      auth.uid(),
      'room_resources_changed',
      'rooms',
      v_id,
      jsonb_build_object('resource_ids', to_jsonb(v_antes)),
      jsonb_build_object('resource_ids', to_jsonb(v_depois))
    );
  end if;

  return v_id;
end;
$$;

revoke all on function public.salvar_espaco(uuid, smallint, text, smallint, integer, public.room_type, uuid[]) from public, anon;
grant execute on function public.salvar_espaco(uuid, smallint, text, smallint, integer, public.room_type, uuid[]) to authenticated;
