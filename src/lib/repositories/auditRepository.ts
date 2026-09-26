import "server-only";
import type { Catalogo } from "@/domain/auditoria/descricao";
import {
  createSupabaseServerClient,
  supabaseAdmin,
} from "@/lib/supabase/server";

export type AuditLogItem = {
  id: number;
  occurredAt: Date;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  beforeState: unknown;
  afterState: unknown;
};

// A política do banco já restringe a leitura à administração. Sem ela, esta
// consulta voltaria vazia em vez de vazar a trilha.
export async function listAuditLogs(limite = 100): Promise<AuditLogItem[]> {
  const supabase = await createSupabaseServerClient();
  const emails = await emailsDasContas();

  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      "id, occurred_at, actor_id, action, entity, entity_id, before_state, after_state, profiles(full_name)"
    )
    .order("occurred_at", { ascending: false })
    .limit(limite);

  if (error) {
    throw new Error(`Falha ao carregar a auditoria: ${error.message}`);
  }

  return data.map((linha) => ({
    id: linha.id,
    occurredAt: new Date(linha.occurred_at),
    actorName: linha.profiles?.full_name ?? null,
    actorEmail: emails.get(linha.actor_id ?? "") ?? null,
    action: linha.action,
    entity: linha.entity,
    entityId: linha.entity_id,
    beforeState: linha.before_state,
    afterState: linha.after_state,
  }));
}

// O e-mail mora em auth.users, que a API não expõe. Só a página de auditoria
// chama isto, depois de conferir que quem pede é administrador.
async function emailsDasContas(): Promise<Map<string, string>> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw new Error(`Falha ao carregar as contas: ${error.message}`);

  return new Map(data.users.map((u) => [u.id, u.email ?? ""]));
}

// Os registros guardam identificadores; isto os traduz para nomes legíveis.
export async function carregarCatalogoDeAuditoria(): Promise<Catalogo> {
  const supabase = await createSupabaseServerClient();

  const [espacos, professores, perfis] = await Promise.all([
    supabase.from("rooms").select("id, name, building"),
    supabase.from("professors").select("id, name"),
    supabase.from("profiles").select("id, full_name"),
  ]);

  for (const { error } of [espacos, professores, perfis]) {
    if (error)
      throw new Error(`Falha ao carregar o catálogo: ${error.message}`);
  }

  return {
    espacos: new Map(
      (espacos.data ?? []).map((e) => [e.id, `${e.building} · ${e.name}`])
    ),
    professores: new Map((professores.data ?? []).map((p) => [p.id, p.name])),
    contas: new Map((perfis.data ?? []).map((p) => [p.id, p.full_name])),
  };
}
