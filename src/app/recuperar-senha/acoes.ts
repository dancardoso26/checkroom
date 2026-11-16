"use server";

import { z } from "zod";

import { criarClienteDoServidor } from "@/lib/supabase/servidor";
import { registrarEventoDeAutenticacao } from "@/lib/auditoria";
import { enderecoDoSite } from "@/lib/endereco-do-site";
import { podeTrocarSenha } from "@/domain/auth/troca-de-senha";
import {
  TAMANHO_MAXIMO_DA_SENHA,
  regrasNaoCumpridas,
} from "@/domain/auth/senha";

const schema = z.object({ email: z.email("Informe um e-mail válido.") });

export type EstadoDaRecuperacao =
  | { status: "inicial" }
  | { status: "enviado" }
  | { status: "erro"; message: string };

export async function pedirRecuperacao(
  _estadoAnterior: EstadoDaRecuperacao,
  formData: FormData,
): Promise<EstadoDaRecuperacao> {
  const parsed = schema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { status: "erro", message: "Informe um e-mail válido." };
  }

  const origem = enderecoDoSite();

  const supabase = await criarClienteDoServidor();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origem}/auth/confirmar?proximo=/nova-senha`,
  });

  await registrarEventoDeAutenticacao("password_reset_requested", null, {
    email: parsed.data.email,
  });

  return { status: "enviado" };
}

const schemaDeSenha = z
  .object({
    senha: z
      .string()
      .max(
        TAMANHO_MAXIMO_DA_SENHA,
        `A senha pode ter no máximo ${TAMANHO_MAXIMO_DA_SENHA} caracteres.`,
      )
      .superRefine((senha, contexto) => {
        const faltando = regrasNaoCumpridas(senha);
        if (faltando.length > 0) {
          contexto.addIssue({
            code: "custom",
            message: `A senha precisa ter ${faltando.join(", ")}.`,
          });
        }
      }),
    confirmacao: z.string(),
  })
  .refine((dados) => dados.senha === dados.confirmacao, {
    message: "As senhas não coincidem.",
    path: ["confirmacao"],
  });

export type EstadoDaNovaSenha =
  | { status: "inicial" }
  | { status: "sucesso" }
  | { status: "erro"; message: string };

export async function definirNovaSenha(
  _estadoAnterior: EstadoDaNovaSenha,
  formData: FormData,
): Promise<EstadoDaNovaSenha> {
  const parsed = schemaDeSenha.safeParse({
    senha: formData.get("senha"),
    confirmacao: formData.get("confirmacao"),
  });

  if (!parsed.success) {
    return {
      status: "erro",
      message: parsed.error.issues.at(0)?.message ?? "Senha inválida.",
    };
  }

  const supabase = await criarClienteDoServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "erro",
      message: "O link expirou. Peça uma nova recuperação de senha.",
    };
  }

  const { data: token } = await supabase.auth.getClaims();
  if (!podeTrocarSenha(token?.claims)) {
    return {
      status: "erro",
      message: "Para trocar a senha, use o link enviado por e-mail.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.senha,
  });

  if (error) {
    return {
      status: "erro",
      message: "Não foi possível trocar a senha agora.",
    };
  }

  await registrarEventoDeAutenticacao("password_changed", user.id);

  await supabase.auth.signOut({ scope: "global" });

  return { status: "sucesso" };
}
