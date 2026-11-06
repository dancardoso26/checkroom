"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { podeGerenciarCadastros } from "@/domain/auth/permissoes";
import { validarRecurso } from "@/domain/espacos/espaco";
import { semErros } from "@/domain/formulario/validacao";
import {
  falha,
  falhaDeValidacao,
  SUCESSO,
  texto,
  type EstadoDoFormulario,
  type ResultadoDaAcao,
} from "@/lib/formulario";
import {
  excluirRecurso as excluirNoBanco,
  listarRecursosParaGestao,
  salvarRecurso as salvarNoBanco,
} from "@/lib/repositories/repositorio-de-recursos";
import { sessaoAtual } from "@/lib/sessao";

const SEM_PERMISSAO = "Apenas a administração mantém o cadastro de recursos.";

const schema = z.object({
  id: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  nome: z.string().trim().max(60, "Use no máximo 60 caracteres."),
});

export async function salvarRecurso(
  _estado: EstadoDoFormulario,
  formData: FormData
): Promise<EstadoDoFormulario> {
  const sessao = await sessaoAtual();
  if (!sessao || !podeGerenciarCadastros(sessao)) return falha(SEM_PERMISSAO);

  const parsed = schema.safeParse({
    id: texto(formData.get("id")),
    nome: texto(formData.get("nome")),
  });

  if (!parsed.success) return falhaDeValidacao(parsed.error);

  const erros = validarRecurso(parsed.data, await listarRecursosParaGestao());
  if (!semErros(erros)) return falha(null, erros);

  const resultado = await salvarNoBanco(parsed.data);

  if (!resultado.ok) {
    return resultado.falha === "duplicado"
      ? falha(null, { nome: ["Já existe um recurso com este nome."] })
      : falha("Não foi possível salvar o recurso agora.");
  }

  revalidatePath("/configuracoes", "layout");
  return SUCESSO;
}

export async function excluirRecurso(id: string): Promise<ResultadoDaAcao> {
  const sessao = await sessaoAtual();
  if (!sessao || !podeGerenciarCadastros(sessao)) {
    return { ok: false, mensagem: SEM_PERMISSAO };
  }

  const resultado = await excluirNoBanco(id);

  if (!resultado.ok) {
    return {
      ok: false,
      mensagem:
        resultado.falha === "em_uso"
          ? "Este recurso foi pedido em reservas e não pode ser excluído."
          : "Não foi possível excluir o recurso agora.",
    };
  }

  revalidatePath("/configuracoes", "layout");
  return { ok: true };
}
