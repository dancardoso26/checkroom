import {
  podeAtenderChamado,
  podeCancelarChamado,
  podeDevolverChamado,
  type Ator,
} from "@/domain/auth/permissoes";
import type { Status } from "@/domain/status/status";
import type { ErrosPorCampo } from "@/domain/formulario/validacao";

export type SituacaoDoChamado = "open" | "in_progress" | "resolved" | "cancelled";
export type Prioridade = "low" | "medium" | "high";
export type AcaoDoChamado = "assumir" | "devolver" | "resolver" | "cancelar";

export const SITUACOES: SituacaoDoChamado[] = [
  "open",
  "in_progress",
  "resolved",
  "cancelled",
];

export const PRIORIDADES: Prioridade[] = ["high", "medium", "low"];

export const STATUS_DA_SITUACAO: Record<SituacaoDoChamado, Status> = {
  open: "aberto",
  in_progress: "em_atendimento",
  resolved: "resolvido",
  cancelled: "chamado_cancelado",
};

export const STATUS_DA_PRIORIDADE: Record<Prioridade, Status> = {
  high: "prioridade_alta",
  medium: "prioridade_media",
  low: "prioridade_baixa",
};

export const ROTULO_DA_SITUACAO: Record<SituacaoDoChamado, string> = {
  open: "Aberto",
  in_progress: "Em atendimento",
  resolved: "Resolvido",
  cancelled: "Cancelado",
};

export const ROTULO_DA_PRIORIDADE: Record<Prioridade, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

export const TAMANHO_MAXIMO_DA_DESCRICAO = 2000;

const ORIGEM: Record<AcaoDoChamado, SituacaoDoChamado> = {
  assumir: "open",
  devolver: "in_progress",
  resolver: "in_progress",
  cancelar: "open",
};

const DESTINO: Record<AcaoDoChamado, SituacaoDoChamado> = {
  assumir: "in_progress",
  devolver: "open",
  resolver: "resolved",
  cancelar: "cancelled",
};

const ACOES: AcaoDoChamado[] = ["assumir", "devolver", "resolver", "cancelar"];

export type ChamadoParaTransicao = {
  situacao: SituacaoDoChamado;
  solicitanteId: string;
  responsavelId: string | null;
};

export type RecusaDaTransicao =
  | "SEM_PERMISSAO"
  | "TRANSICAO_INVALIDA"
  | "NOTA_OBRIGATORIA";

export type ResultadoDaTransicao =
  | { ok: true; novaSituacao: SituacaoDoChamado }
  | { ok: false; recusa: RecusaDaTransicao };

function permitido(acao: AcaoDoChamado, ator: Ator, chamado: ChamadoParaTransicao) {
  if (acao === "cancelar") {
    return podeCancelarChamado(ator, { solicitanteId: chamado.solicitanteId });
  }
  if (acao === "devolver") {
    return podeDevolverChamado(ator, { responsavelId: chamado.responsavelId });
  }
  return podeAtenderChamado(ator);
}

export function validarTransicao(
  chamado: ChamadoParaTransicao,
  acao: AcaoDoChamado,
  ator: Ator,
  nota = ""
): ResultadoDaTransicao {
  if (!permitido(acao, ator, chamado)) {
    return { ok: false, recusa: "SEM_PERMISSAO" };
  }

  if (chamado.situacao !== ORIGEM[acao]) {
    return { ok: false, recusa: "TRANSICAO_INVALIDA" };
  }

  if (acao === "resolver" && nota.trim() === "") {
    return { ok: false, recusa: "NOTA_OBRIGATORIA" };
  }

  return { ok: true, novaSituacao: DESTINO[acao] };
}

export function acoesDisponiveis(
  chamado: ChamadoParaTransicao,
  ator: Ator
): AcaoDoChamado[] {
  return ACOES.filter(
    (acao) => permitido(acao, ator, chamado) && chamado.situacao === ORIGEM[acao]
  );
}

export const MENSAGEM_DA_RECUSA: Record<RecusaDaTransicao, string> = {
  SEM_PERMISSAO: "Você não pode executar esta ação neste chamado.",
  TRANSICAO_INVALIDA:
    "A situação do chamado mudou e esta ação não se aplica mais. Atualize a página.",
  NOTA_OBRIGATORIA: "Descreva a solução para resolver o chamado.",
};

export function recusaDoBanco(codigo: string): RecusaDaTransicao | "NAO_ENCONTRADO" | null {
  switch (codigo) {
    case "ok":
      return null;
    case "forbidden":
      return "SEM_PERMISSAO";
    case "invalid_transition":
      return "TRANSICAO_INVALIDA";
    case "note_required":
      return "NOTA_OBRIGATORIA";
    default:
      return "NAO_ENCONTRADO";
  }
}

export type DadosDaAbertura = {
  espacoId: string;
  descricao: string;
  prioridade: Prioridade;
};

export function validarAbertura(dados: DadosDaAbertura): ErrosPorCampo {
  const erros: ErrosPorCampo = {};

  if (dados.espacoId === "") erros.espacoId = ["Selecione o espaço."];

  const descricao = dados.descricao.trim();
  if (descricao === "") {
    erros.descricao = ["Descreva o problema."];
  } else if (descricao.length > TAMANHO_MAXIMO_DA_DESCRICAO) {
    erros.descricao = [
      `Use no máximo ${TAMANHO_MAXIMO_DA_DESCRICAO} caracteres.`,
    ];
  }

  return erros;
}

const PESO_DA_SITUACAO: Record<SituacaoDoChamado, number> = {
  open: 0,
  in_progress: 1,
  resolved: 2,
  cancelled: 3,
};

const PESO_DA_PRIORIDADE: Record<Prioridade, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function ordenarFila<
  T extends { situacao: SituacaoDoChamado; prioridade: Prioridade; abertoEm: Date },
>(chamados: T[]): T[] {
  return [...chamados].sort((a, b) => {
    const situacao = PESO_DA_SITUACAO[a.situacao] - PESO_DA_SITUACAO[b.situacao];
    if (situacao !== 0) return situacao;

    const pendente = a.situacao === "open" || a.situacao === "in_progress";
    if (!pendente) return b.abertoEm.getTime() - a.abertoEm.getTime();

    const prioridade = PESO_DA_PRIORIDADE[a.prioridade] - PESO_DA_PRIORIDADE[b.prioridade];
    if (prioridade !== 0) return prioridade;

    return a.abertoEm.getTime() - b.abertoEm.getTime();
  });
}
