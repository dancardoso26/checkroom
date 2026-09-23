"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registrarEventoDeAutenticacao } from "@/lib/auditoria";

// Só o registro de auditoria fica no servidor: a verificação em si acontece no
// navegador, para que a sessão renovada chegue aos cookies.
export async function registrarCadastroDeSegundoFator(): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) await registrarEventoDeAutenticacao("mfa_enrolled", user.id);
}
