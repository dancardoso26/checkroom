import { z } from "zod";

import type { ErrosPorCampo } from "@/domain/formulario/validacao";

export type EstadoDoFormulario =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      mensagem: string | null;
      erros: Record<string, string[]>;
    };

export const ESTADO_INICIAL: EstadoDoFormulario = { status: "idle" };

export const SUCESSO: EstadoDoFormulario = { status: "success" };

export function falha(
  mensagem: string | null,
  erros: ErrosPorCampo = {}
): EstadoDoFormulario {
  return { status: "error", mensagem, erros: erros as Record<string, string[]> };
}

export function falhaDeValidacao(erro: z.ZodError): EstadoDoFormulario {
  return falha(null, z.flattenError(erro).fieldErrors as Record<string, string[]>);
}

export function texto(valor: FormDataEntryValue | null): string {
  return typeof valor === "string" ? valor : "";
}

export type ResultadoDaAcao = { ok: true } | { ok: false; mensagem: string };
