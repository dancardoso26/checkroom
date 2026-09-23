"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registrarEventoDeAutenticacao } from "@/lib/auditoria";

const schema = z.object({
  factorId: z.uuid(),
  codigo: z.string().regex(/^\d{6}$/, "O código tem seis dígitos."),
});

export type VerificacaoState =
  | { status: "idle" }
  | { status: "error"; message: string };

export async function verificarCodigo(
  _prevState: VerificacaoState,
  formData: FormData
): Promise<VerificacaoState> {
  const parsed = schema.safeParse({
    factorId: formData.get("factorId"),
    codigo: formData.get("codigo"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Digite os seis dígitos do código." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: desafio, error: erroDoDesafio } =
    await supabase.auth.mfa.challenge({ factorId: parsed.data.factorId });

  if (erroDoDesafio) {
    return { status: "error", message: "Não foi possível verificar agora." };
  }

  const { error } = await supabase.auth.mfa.verify({
    factorId: parsed.data.factorId,
    challengeId: desafio.id,
    code: parsed.data.codigo,
  });

  if (error) {
    return {
      status: "error",
      message: "Código incorreto ou expirado. O código muda a cada 30 segundos.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Só o primeiro uso confirma o fator, então é aqui que o cadastro termina.
  const novo = formData.get("primeiroUso") === "1";
  if (user && novo) {
    await registrarEventoDeAutenticacao("mfa_enrolled", user.id);
  }

  redirect("/reservas");
}
