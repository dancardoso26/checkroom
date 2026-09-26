"use server";

import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registrarEventoDeAutenticacao } from "@/lib/auditoria";
import { enderecoDoSite } from "@/lib/endereco-do-site";
import { podeTrocarSenha } from "@/lib/troca-de-senha";

const schema = z.object({ email: z.email("Informe um e-mail válido.") });

export type RecuperacaoState =
  | { status: "idle" }
  | { status: "enviado" }
  | { status: "error"; message: string };

export async function pedirRecuperacao(
  _prevState: RecuperacaoState,
  formData: FormData
): Promise<RecuperacaoState> {
  const parsed = schema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { status: "error", message: "Informe um e-mail válido." };
  }

  const origem = enderecoDoSite();

  const supabase = await createSupabaseServerClient();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origem}/auth/confirmar?proximo=/nova-senha`,
  });

  await registrarEventoDeAutenticacao("password_reset_requested", null, {
    email: parsed.data.email,
  });

  // A resposta é a mesma para e-mail existente ou não: distinguir os dois
  // diria a um estranho quais endereços têm conta no sistema.
  return { status: "enviado" };
}

const schemaDeSenha = z
  .object({
    senha: z.string().min(8, "A senha precisa de ao menos oito caracteres."),
    confirmacao: z.string(),
  })
  .refine((dados) => dados.senha === dados.confirmacao, {
    message: "As senhas não coincidem.",
    path: ["confirmacao"],
  });

export type NovaSenhaState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export async function definirNovaSenha(
  _prevState: NovaSenhaState,
  formData: FormData
): Promise<NovaSenhaState> {
  const parsed = schemaDeSenha.safeParse({
    senha: formData.get("senha"),
    confirmacao: formData.get("confirmacao"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues.at(0)?.message ?? "Senha inválida.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "O link expirou. Peça uma nova recuperação de senha.",
    };
  }

  // Só troca a senha quem chegou pelo link do e-mail, ou quem já passou pelo
  // segundo fator. Sem isso, quem soubesse só a senha de alguém a trocaria e
  // trancaria o dono do lado de fora, sem nunca ter o autenticador dele.
  const { data: token } = await supabase.auth.getClaims();
  if (!podeTrocarSenha(token?.claims)) {
    return {
      status: "error",
      message: "Para trocar a senha, use o link enviado por e-mail.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.senha,
  });

  if (error) {
    return {
      status: "error",
      message: "Não foi possível trocar a senha agora.",
    };
  }

  await registrarEventoDeAutenticacao("password_changed", user.id);

  // Encerra a sessão de recuperação: a nova senha deve ser usada para entrar,
  // e o segundo fator volta a ser exigido.
  // global encerra todas as sessões da conta, inclusive em outros aparelhos:
  // quem trocou a senha por suspeita de invasão tira o invasor junto.
  await supabase.auth.signOut({ scope: "global" });

  return { status: "success" };
}
