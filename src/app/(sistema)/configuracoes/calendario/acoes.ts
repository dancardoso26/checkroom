"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { podeGerenciarCadastros } from "@/domain/auth/permissoes";
import { validarBloqueio, validarPeriodo } from "@/domain/calendario/calendario";
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
  excluirDoCalendario,
  listarPeriodos,
  salvarBloqueio as salvarBloqueioNoBanco,
  salvarPeriodo as salvarPeriodoNoBanco,
} from "@/lib/repositories/repositorio-do-calendario";
import { sessaoAtual } from "@/lib/sessao";

const SEM_PERMISSAO = "Apenas a administração mantém o calendário letivo.";

const TODOS_OS_ESPACOS = "todos";

const id = z.union([z.uuid(), z.literal("")]).transform((v) => v || null);

async function autorizado(): Promise<boolean> {
  const sessao = await sessaoAtual();
  return sessao !== null && podeGerenciarCadastros(sessao);
}

export async function salvarPeriodo(
  _estado: EstadoDoFormulario,
  formData: FormData
): Promise<EstadoDoFormulario> {
  if (!(await autorizado())) return falha(SEM_PERMISSAO);

  const parsed = z
    .object({ id, codigo: z.string().trim(), inicio: z.string(), fim: z.string() })
    .safeParse({
      id: texto(formData.get("id")),
      codigo: texto(formData.get("codigo")),
      inicio: texto(formData.get("inicio")),
      fim: texto(formData.get("fim")),
    });
  if (!parsed.success) return falhaDeValidacao(parsed.error);

  const erros = validarPeriodo(parsed.data, await listarPeriodos());
  if (!semErros(erros)) return falha(null, erros);

  const resultado = await salvarPeriodoNoBanco(parsed.data);

  if (!resultado.ok) {
    if (resultado.falha === "duplicado") {
      return falha(null, { codigo: ["Este período já está cadastrado."] });
    }
    if (resultado.falha === "conflito") {
      return falha(null, { inicio: ["As datas cruzam outro período letivo."] });
    }
    return falha("Não foi possível salvar o período agora.");
  }

  revalidatePath("/configuracoes/calendario");
  return SUCESSO;
}

export async function salvarBloqueio(
  _estado: EstadoDoFormulario,
  formData: FormData
): Promise<EstadoDoFormulario> {
  if (!(await autorizado())) return falha(SEM_PERMISSAO);

  const parsed = z
    .object({
      id,
      inicio: z.string(),
      fim: z.string(),
      espacoId: z
        .union([z.uuid(), z.literal(TODOS_OS_ESPACOS), z.literal("")])
        .transform((v) => (v === TODOS_OS_ESPACOS || v === "" ? null : v)),
      motivo: z.string(),
    })
    .safeParse({
      id: texto(formData.get("id")),
      inicio: texto(formData.get("inicio")),
      fim: texto(formData.get("fim")),
      espacoId: texto(formData.get("espacoId")),
      motivo: texto(formData.get("motivo")),
    });
  if (!parsed.success) return falhaDeValidacao(parsed.error);

  const erros = validarBloqueio(parsed.data);
  if (!semErros(erros)) return falha(null, erros);

  const resultado = await salvarBloqueioNoBanco(parsed.data);
  if (!resultado.ok) return falha("Não foi possível salvar o bloqueio agora.");

  revalidatePath("/configuracoes/calendario");
  return SUCESSO;
}

export async function excluirPeriodo(registroId: string): Promise<ResultadoDaAcao> {
  return excluir("academic_terms", registroId);
}

export async function excluirBloqueio(registroId: string): Promise<ResultadoDaAcao> {
  return excluir("calendar_blocks", registroId);
}

async function excluir(
  tabela: "academic_terms" | "calendar_blocks",
  registroId: string
): Promise<ResultadoDaAcao> {
  if (!(await autorizado())) return { ok: false, mensagem: SEM_PERMISSAO };

  const resultado = await excluirDoCalendario(tabela, registroId);
  if (!resultado.ok) {
    return { ok: false, mensagem: "Não foi possível excluir agora. Atualize a página." };
  }

  revalidatePath("/configuracoes/calendario");
  return { ok: true };
}
