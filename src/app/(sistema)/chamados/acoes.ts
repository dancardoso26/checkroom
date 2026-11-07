"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  podeAbrirChamado,
  podeExcluirChamado,
} from "@/domain/auth/permissoes";
import {
  MENSAGEM_DA_RECUSA,
  PRIORIDADES,
  recusaDoBanco,
  validarAbertura,
  validarTransicao,
  type AcaoDoChamado,
  type Prioridade,
} from "@/domain/chamados/chamado";
import { semErros } from "@/domain/formulario/validacao";
import { avisarSobreChamadoResolvido } from "@/lib/email/enviar";
import { formatDateTime } from "@/lib/datetime";
import {
  falha,
  falhaDeValidacao,
  SUCESSO,
  texto,
  type EstadoDoFormulario,
  type ResultadoDaAcao,
} from "@/lib/formulario";
import {
  abrirChamado as abrirNoBanco,
  buscarChamadoParaTransicao,
  dadosParaAvisoDoChamado,
  excluirChamadoNoBanco,
  transicionarChamado,
} from "@/lib/repositories/repositorio-de-chamados";
import { sessaoAtual } from "@/lib/sessao";

const schemaDaAbertura = z.object({
  espacoId: z.union([z.uuid(), z.literal("")]),
  descricao: z.string(),
  prioridade: z.enum(PRIORIDADES as [Prioridade, ...Prioridade[]], {
    error: "Selecione a prioridade.",
  }),
});

export async function abrirChamado(
  _estado: EstadoDoFormulario,
  formData: FormData
): Promise<EstadoDoFormulario> {
  const sessao = await sessaoAtual();
  if (!sessao || !podeAbrirChamado(sessao)) {
    return falha("Apenas professores e a administração abrem chamados.");
  }

  const parsed = schemaDaAbertura.safeParse({
    espacoId: texto(formData.get("espacoId")),
    descricao: texto(formData.get("descricao")),
    prioridade: texto(formData.get("prioridade")),
  });

  if (!parsed.success) return falhaDeValidacao(parsed.error);

  const erros = validarAbertura(parsed.data);
  if (!semErros(erros)) return falha(null, erros);

  const resultado = await abrirNoBanco(parsed.data, sessao.profileId);

  if (!resultado.ok) {
    return falha(
      resultado.falha === "em_uso"
        ? "Este espaço não existe mais. Atualize a página."
        : "Não foi possível abrir o chamado agora."
    );
  }

  revalidatePath("/chamados");
  return SUCESSO;
}

async function transicionar(
  id: string,
  acao: AcaoDoChamado,
  nota = ""
): Promise<ResultadoDaAcao> {
  const sessao = await sessaoAtual();
  const chamado = await buscarChamadoParaTransicao(id);

  if (!sessao || !chamado) {
    return { ok: false, mensagem: "Chamado não encontrado. Atualize a página." };
  }

  const decisao = validarTransicao(chamado, acao, sessao, nota);
  if (!decisao.ok) {
    return { ok: false, mensagem: MENSAGEM_DA_RECUSA[decisao.recusa] };
  }

  const recusa = recusaDoBanco(await transicionarChamado(acao, id, nota));

  if (recusa === "NAO_ENCONTRADO") {
    return { ok: false, mensagem: "Não foi possível atualizar o chamado agora." };
  }
  if (recusa) return { ok: false, mensagem: MENSAGEM_DA_RECUSA[recusa] };

  revalidatePath("/chamados");
  return { ok: true };
}

export async function assumirChamado(id: string): Promise<ResultadoDaAcao> {
  return transicionar(id, "assumir");
}

export async function devolverChamado(id: string): Promise<ResultadoDaAcao> {
  return transicionar(id, "devolver");
}

export async function cancelarChamado(id: string): Promise<ResultadoDaAcao> {
  return transicionar(id, "cancelar");
}

export async function excluirChamado(id: string): Promise<ResultadoDaAcao> {
  const sessao = await sessaoAtual();

  if (!sessao || !podeExcluirChamado(sessao)) {
    return { ok: false, mensagem: MENSAGEM_DA_RECUSA.SEM_PERMISSAO };
  }

  const resultado = await excluirChamadoNoBanco(id);

  if (resultado === "not_found") {
    return { ok: false, mensagem: "Chamado não encontrado. Atualize a página." };
  }
  if (resultado !== "ok") {
    return { ok: false, mensagem: "Não foi possível excluir o chamado agora." };
  }

  revalidatePath("/chamados");
  return { ok: true };
}

export async function resolverChamado(
  _estado: EstadoDoFormulario,
  formData: FormData
): Promise<EstadoDoFormulario> {
  const id = texto(formData.get("id"));
  const nota = texto(formData.get("nota")).trim();

  if (nota === "") return falha(null, { nota: [MENSAGEM_DA_RECUSA.NOTA_OBRIGATORIA] });
  if (nota.length > 2000) return falha(null, { nota: ["Use no máximo 2000 caracteres."] });

  const resultado = await transicionar(id, "resolver", nota);
  if (!resultado.ok) return falha(resultado.mensagem);

  await avisarSolicitante(id);
  return SUCESSO;
}

export async function resolverChamadosEmLote(
  _estado: EstadoDoFormulario,
  formData: FormData
): Promise<EstadoDoFormulario> {
  const ids = formData.getAll("ids").map(texto).filter(Boolean);
  const nota = texto(formData.get("nota")).trim();

  if (nota === "") return falha(null, { nota: [MENSAGEM_DA_RECUSA.NOTA_OBRIGATORIA] });
  if (nota.length > 2000) return falha(null, { nota: ["Use no máximo 2000 caracteres."] });
  if (ids.length === 0) return falha("Selecione ao menos um chamado.");

  const falhas: string[] = [];

  for (const id of ids) {
    const resultado = await transicionar(id, "resolver", nota);
    if (!resultado.ok) {
      falhas.push(resultado.mensagem);
      continue;
    }
    await avisarSolicitante(id);
  }

  if (falhas.length > 0) {
    return falha(
      `${ids.length - falhas.length} de ${ids.length} resolvidos. ${[...new Set(falhas)].join(" ")}`
    );
  }

  return SUCESSO;
}

async function avisarSolicitante(id: string) {
  const dados = await dadosParaAvisoDoChamado(id);
  if (!dados?.solicitanteEmail) return;

  await avisarSobreChamadoResolvido(dados.solicitanteEmail, {
    solicitanteNome: dados.solicitanteNome,
    espaco: dados.espaco,
    descricao: dados.descricao,
    nota: dados.nota,
    resolvidoPor: dados.responsavelNome,
    abertoEm: formatDateTime(dados.abertoEm),
  });
}
