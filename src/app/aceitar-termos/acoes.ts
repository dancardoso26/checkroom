"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registrarEventoDeAutenticacao } from "@/lib/auditoria";
import { VERSAO_DOS_TERMOS } from "@/domain/documentos/documentos";

export type AceiteState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export async function aceitarTermos(
  estadoAnterior: AceiteState,
  dados: FormData
): Promise<AceiteState> {
  void estadoAnterior;
  void dados;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      terms_accepted_at: new Date().toISOString(),
      terms_version: VERSAO_DOS_TERMOS,
    })
    .eq("id", user.id);

  if (error) {
    return { status: "error", message: "Não foi possível registrar o aceite." };
  }

  await registrarEventoDeAutenticacao("terms_accepted", user.id, {
    versao: VERSAO_DOS_TERMOS,
  });

  return { status: "success" };
}
