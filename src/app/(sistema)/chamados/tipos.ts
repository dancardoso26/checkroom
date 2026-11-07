import type { AcaoDoChamado, Prioridade } from "@/domain/chamados/chamado";
import type { ChamadoItem } from "@/lib/repositories/repositorio-de-chamados";

export type Linha = ChamadoItem & { acoes: AcaoDoChamado[] };

export type VisaoDosChamados = "pipeline" | "tabela";

export const DIAS_NA_COLUNA_DE_CONCLUIDOS = 30;

export const COLUNAS_DO_PIPELINE: {
  id: "abertos" | "andamento" | "concluidos";
  rotulo: string;
  situacao: ChamadoItem["situacao"];
  vazio: string;
}[] = [
  {
    id: "abertos",
    rotulo: "Em aberto",
    situacao: "open",
    vazio: "Nenhum chamado aguardando atendimento.",
  },
  {
    id: "andamento",
    rotulo: "Em andamento",
    situacao: "in_progress",
    vazio: "Nenhum chamado em atendimento no momento.",
  },
  {
    id: "concluidos",
    rotulo: "Concluídos",
    situacao: "resolved",
    vazio: `Nenhum chamado resolvido nos últimos ${DIAS_NA_COLUNA_DE_CONCLUIDOS} dias.`,
  },
];

export const PESO_DA_PRIORIDADE: Record<Prioridade, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function visaoDoChamado(
  situacao: ChamadoItem["situacao"] | undefined,
): VisaoDosChamados {
  return situacao === "cancelled" ? "tabela" : "pipeline";
}

export function chamadosDaColuna(
  chamados: Linha[],
  situacao: ChamadoItem["situacao"],
  agora: Date,
): Linha[] {
  const daColuna = chamados.filter((c) => c.situacao === situacao);

  if (situacao !== "resolved") return daColuna;

  const limite =
    agora.getTime() - DIAS_NA_COLUNA_DE_CONCLUIDOS * 24 * 60 * 60 * 1000;

  return daColuna
    .filter((c) => (c.resolvidoEm?.getTime() ?? 0) >= limite)
    .sort(
      (a, b) =>
        (b.resolvidoEm?.getTime() ?? 0) - (a.resolvidoEm?.getTime() ?? 0),
    );
}
