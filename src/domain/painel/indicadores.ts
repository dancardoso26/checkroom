import type { Prioridade, SituacaoDoChamado } from "@/domain/chamados/chamado";

import { taxaMediaDeOcupacao, type OcupacaoDoEspaco } from "./ocupacao";
import { dentro, horasDentro, UMA_HORA, type Periodo } from "./periodo";
import type {
  ChamadoDoPainel,
  PalestraDoPainel,
  ReservaDoPainel,
  TipoDeAtividade,
} from "./tipos";

export type ChamadosPorSituacao = {
  situacao: SituacaoDoChamado;
  total: number;
} & Record<Prioridade, number>;

export function chamadosPorSituacao(
  chamados: ChamadoDoPainel[]
): ChamadosPorSituacao[] {
  const situacoes: SituacaoDoChamado[] = ["open", "in_progress", "resolved", "cancelled"];

  return situacoes.map((situacao) => {
    const daSituacao = chamados.filter((c) => c.situacao === situacao);
    return {
      situacao,
      total: daSituacao.length,
      high: daSituacao.filter((c) => c.prioridade === "high").length,
      medium: daSituacao.filter((c) => c.prioridade === "medium").length,
      low: daSituacao.filter((c) => c.prioridade === "low").length,
    };
  });
}

export function chamadosCriadosNoPeriodo(
  chamados: ChamadoDoPainel[],
  periodo: Periodo
): ChamadoDoPainel[] {
  return chamados.filter((c) => dentro(c.criadoEm, periodo));
}

function media(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return valores.reduce((soma, v) => soma + v, 0) / valores.length;
}

export type IndicadoresDeReservas = {
  reservas: number;
  canceladas: number;
  taxaDeCancelamento: number;
  taxaMedia: number;
  horasReservadas: number;
};

export function indicadoresDeReservas(
  reservas: ReservaDoPainel[],
  ocupacao: OcupacaoDoEspaco[],
  periodo: Periodo
): IndicadoresDeReservas {
  const ativas = reservas.filter((r) => !r.cancelada);
  const canceladas = reservas.length - ativas.length;

  return {
    reservas: ativas.length,
    canceladas,
    taxaDeCancelamento: reservas.length > 0 ? canceladas / reservas.length : 0,
    taxaMedia: taxaMediaDeOcupacao(ocupacao),
    horasReservadas:
      Math.round(
        ativas.reduce((soma, r) => soma + horasDentro(r, periodo), 0) * 10
      ) / 10,
  };
}

export type IndicadoresDePalestras = {
  palestras: number;
  inscricoes: number;
  preenchimento: number;
  lotadas: number;
};

export function indicadoresDePalestras(
  palestras: PalestraDoPainel[]
): IndicadoresDePalestras {
  const vagas = palestras.reduce((soma, p) => soma + p.vagas, 0);
  const inscricoes = palestras.reduce((soma, p) => soma + p.inscritos, 0);

  return {
    palestras: palestras.length,
    inscricoes,
    preenchimento: vagas > 0 ? inscricoes / vagas : 0,
    lotadas: palestras.filter((p) => p.vagas > 0 && p.inscritos >= p.vagas)
      .length,
  };
}

export type IndicadoresDeChamados = {
  criados: number;
  abertos: number;
  emAtendimento: number;
  horasAteAssumir: number | null;
  horasAteResolver: number | null;
};

export function indicadoresDeChamados(
  chamados: ChamadoDoPainel[],
  periodo: Periodo
): IndicadoresDeChamados {
  const criados = chamados.filter((c) => dentro(c.criadoEm, periodo));

  return {
    criados: criados.length,
    abertos: criados.filter((c) => c.situacao === "open").length,
    emAtendimento: criados.filter((c) => c.situacao === "in_progress").length,
    horasAteAssumir: media(
      criados
        .filter((c) => c.iniciadoEm)
        .map((c) => (c.iniciadoEm!.getTime() - c.criadoEm.getTime()) / UMA_HORA)
    ),
    horasAteResolver: media(
      criados
        .filter((c) => c.resolvidoEm)
        .map((c) => (c.resolvidoEm!.getTime() - c.criadoEm.getTime()) / UMA_HORA)
    ),
  };
}

export function formatarDuracao(horas: number | null): string {
  if (horas === null) return "-";

  const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  if (horas < 1) return `${Math.max(1, Math.round(horas * 60))} min`;
  if (horas < 48) return `${numero.format(horas)} h`;
  return `${numero.format(horas / 24)} dias`;
}

export type ItemDoRanking = { id: string; nome: string; total: number };

export function rankingPorContagem(
  ids: (string | null)[],
  nomes: Map<string, string>,
  limite = 5
): ItemDoRanking[] {
  const contagem = new Map<string, number>();
  for (const id of ids) {
    if (id) contagem.set(id, (contagem.get(id) ?? 0) + 1);
  }

  return [...contagem.entries()]
    .map(([id, total]) => ({ id, nome: nomes.get(id) ?? "Removido", total }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, limite);
}

const ROTULO_DO_TIPO: Record<TipoDeAtividade, string> = {
  class: "Aula",
  lecture: "Palestra",
  exam: "Prova",
  event: "Evento",
};

export function reservasPorTipo(
  reservas: ReservaDoPainel[]
): { tipo: string; total: number }[] {
  return (Object.keys(ROTULO_DO_TIPO) as TipoDeAtividade[])
    .map((tipo) => ({
      tipo: ROTULO_DO_TIPO[tipo],
      total: reservas.filter((r) => !r.cancelada && r.tipo === tipo).length,
    }))
    .filter((linha) => linha.total > 0);
}
