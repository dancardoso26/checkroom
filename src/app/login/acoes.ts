"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { destinoAposLogin } from "@/domain/auth/destino-apos-login";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registrarEventoDeAutenticacao } from "@/lib/auditoria";

const schema = z.object({
  email: z.email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe a senha."),
  proximo: z.string().optional(),
});

export type LoginState =
  | { status: "idle" }
  | { status: "success"; destino: string }
  | { status: "error"; message: string };

export async function entrar(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
    proximo: formData.get("proximo"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Informe e-mail e senha." };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });

  if (error) {
    await registrarEventoDeAutenticacao("login_failed", null, {
      email: parsed.data.email,
    });

    return { status: "error", message: "E-mail ou senha incorretos." };
  }

  await registrarEventoDeAutenticacao("login", data.user.id);

  return {
    status: "success",
    destino: destinoAposLogin(parsed.data.proximo),
  };
}

export async function sair() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) await registrarEventoDeAutenticacao("logout", user.id);

  await supabase.auth.signOut();
  redirect("/login");
}
