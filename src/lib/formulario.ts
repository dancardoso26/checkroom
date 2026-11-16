import { z } from "zod";

import type { ErrosPorCampo } from "@/domain/formulario/validacao";

export type EstadoDoFormulario =
  | { status: "inicial" }
  | { status: "sucesso" }
  | {
      status: "erro";
      mensagem: string | null;
      erros: Record<string, string[]>;
    };

export const ESTADO_INICIAL: EstadoDoFormulario = { status: "inicial" };

export const SUCESSO: EstadoDoFormulario = { status: "sucesso" };

export function falha(
  mensagem: string | null,
  erros: ErrosPorCampo = {},
): EstadoDoFormulario {
  return { status: "erro", mensagem, erros: erros as Record<string, string[]> };
}

export function falhaDeValidacao(erro: z.ZodError): EstadoDoFormulario {
  return falha(
    null,
    z.flattenError(erro).fieldErrors as Record<string, string[]>,
  );
}

export function texto(valor: FormDataEntryValue | null): string {
  return typeof valor === "string" ? valor : "";
}

export type ResultadoDaAcao = { ok: true } | { ok: false; mensagem: string };
