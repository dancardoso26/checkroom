begin;

select set_config('evid.email', 'aluno@umc.br', true);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = current_setting('evid.email')),
    'role', 'authenticated'
  )::text,
  true
);

set local role authenticated;

do $$
declare
  v_linhas integer;
  v_outra_turma uuid;
  v_reserva_alheia uuid;
begin
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    perform set_config('evid.trocar_o_proprio_papel', 'ACEITO', true);
  exception when others then
    perform set_config('evid.trocar_o_proprio_papel', 'recusado: ' || sqlerrm, true);
  end;

  select id into v_outra_turma from public.classes
   where id is distinct from public.turma_atual() limit 1;
  begin
    update public.profiles set class_id = v_outra_turma where id = auth.uid();
    perform set_config('evid.trocar_a_propria_turma', 'ACEITO', true);
  exception when others then
    perform set_config('evid.trocar_a_propria_turma', 'recusado: ' || sqlerrm, true);
  end;

  begin
    insert into public.audit_logs (action, entity) values ('forjado', 'teste');
    perform set_config('evid.gravar_na_auditoria', 'ACEITO', true);
  exception when others then
    perform set_config('evid.gravar_na_auditoria', 'recusado: ' || sqlerrm, true);
  end;

  begin
    delete from public.audit_logs;
    get diagnostics v_linhas = row_count;
    perform set_config('evid.apagar_a_auditoria', v_linhas || ' linhas apagadas', true);
  exception when others then
    perform set_config('evid.apagar_a_auditoria', 'recusado: ' || sqlerrm, true);
  end;

  select id into v_reserva_alheia from public.bookings
   where professor_id is distinct from public.professor_atual()
     and created_by <> auth.uid()
   limit 1;
  begin
    update public.bookings set purpose = purpose where id = v_reserva_alheia;
    get diagnostics v_linhas = row_count;
    perform set_config(
      'evid.alterar_reserva_alheia',
      case when v_reserva_alheia is null then 'nenhuma reserva alheia visível'
           else v_linhas || ' linhas alteradas' end,
      true
    );
  exception when others then
    perform set_config('evid.alterar_reserva_alheia', 'recusado: ' || sqlerrm, true);
  end;

  begin
    update public.tickets set status = 'resolved';
    get diagnostics v_linhas = row_count;
    perform set_config('evid.mudar_chamado_por_update', v_linhas || ' linhas alteradas', true);
  exception when others then
    perform set_config('evid.mudar_chamado_por_update', 'recusado: ' || sqlerrm, true);
  end;

  begin
    perform public.remover_usuario(gen_random_uuid());
    perform set_config('evid.remover_outro_usuario', 'ACEITO', true);
  exception when others then
    perform set_config('evid.remover_outro_usuario', 'recusado: ' || sqlerrm, true);
  end;
end;
$$;

select
  (select role from public.profiles where id = auth.uid()) as papel,
  (select count(*) from public.bookings) as reservas_visiveis,
  (select count(*) from public.bookings
    where public.eh_aluno() and class_id is distinct from public.turma_atual()) as reservas_de_outra_turma,
  (select count(*) from public.profiles) as perfis_visiveis,
  (select count(*) from public.audit_logs) as auditoria_visivel,
  (select count(*) from public.tickets) as chamados_visiveis,
  (select count(*) from public.lecture_enrollments where profile_id <> auth.uid()) as inscricoes_de_outros,
  current_setting('evid.trocar_o_proprio_papel', true) as trocar_o_proprio_papel,
  current_setting('evid.trocar_a_propria_turma', true) as trocar_a_propria_turma,
  current_setting('evid.gravar_na_auditoria', true) as gravar_na_auditoria,
  current_setting('evid.apagar_a_auditoria', true) as apagar_a_auditoria,
  current_setting('evid.alterar_reserva_alheia', true) as alterar_reserva_alheia,
  current_setting('evid.mudar_chamado_por_update', true) as mudar_chamado_por_update,
  current_setting('evid.remover_outro_usuario', true) as remover_outro_usuario;

rollback;
