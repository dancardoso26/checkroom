"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registrarEventoDeAutenticacao } from "@/lib/auditoria";

export async function registrarCadastroDeSegundoFator(): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: fatores } = await supabase.auth.mfa.listFactors();
  if (!fatores?.totp.some((fator) => fator.status === "verified")) return;

  await registrarEventoDeAutenticacao("mfa_enrolled", user.id);
}
