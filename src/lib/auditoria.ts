import "server-only";

import { clienteAdministrativo } from "@/lib/supabase/servidor";
import type { Json } from "@/lib/supabase/database.types";

export type EventoDeAutenticacao =
  | "login"
  | "login_failed"
  | "logout"
  | "password_reset_requested"
  | "password_changed"
  | "mfa_enrolled"
  | "terms_accepted"
  | "account_anonymized"
  | "user_deactivated"
  | "user_reactivated"
  | "user_invited";

export async function registrarEventoDeAutenticacao(
  acao: EventoDeAutenticacao,
  autorId: string | null,
  detalhes?: Json,
): Promise<void> {
  const { error } = await clienteAdministrativo.from("audit_logs").insert({
    actor_id: autorId,
    action: acao,
    entity: "auth",
    after_state: detalhes ?? null,
  });

  if (error) {
    console.error(`Falha ao registrar evento de auditoria ${acao}:`, error);
  }
}
