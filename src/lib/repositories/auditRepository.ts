import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuditLogItem = {
  id: number;
  occurredAt: Date;
  actorName: string | null;
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

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, occurred_at, action, entity, entity_id, before_state, after_state, profiles(full_name)")
    .order("occurred_at", { ascending: false })
    .limit(limite);

  if (error) {
    throw new Error(`Falha ao carregar a auditoria: ${error.message}`);
  }

  return data.map((linha) => ({
    id: linha.id,
    occurredAt: new Date(linha.occurred_at),
    actorName: linha.profiles?.full_name ?? null,
    action: linha.action,
    entity: linha.entity,
    entityId: linha.entity_id,
    beforeState: linha.before_state,
    afterState: linha.after_state,
  }));
}
