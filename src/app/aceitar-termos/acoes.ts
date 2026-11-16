"use server";

import { redirect } from "next/navigation";

import { criarClienteDoServidor } from "@/lib/supabase/servidor";
import { registrarEventoDeAutenticacao } from "@/lib/auditoria";
import { VERSAO_DOS_TERMOS } from "@/domain/documentos/documentos";

export type EstadoDoAceite =
  | { status: "inicial" }
  | { status: "sucesso" }
  | { status: "erro"; message: string };

export async function aceitarTermos(
  estadoAnterior: EstadoDoAceite,
  dados: FormData,
): Promise<EstadoDoAceite> {
  void estadoAnterior;
  void dados;

  const supabase = await criarClienteDoServidor();

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
    return { status: "erro", message: "Não foi possível registrar o aceite." };
  }

  await registrarEventoDeAutenticacao("terms_accepted", user.id, {
    versao: VERSAO_DOS_TERMOS,
  });

  return { status: "sucesso" };
}
