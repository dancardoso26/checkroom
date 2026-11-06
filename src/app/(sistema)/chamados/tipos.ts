import type { AcaoDoChamado, Prioridade } from "@/domain/chamados/chamado";
import type { ChamadoItem } from "@/lib/repositories/repositorio-de-chamados";

export type Linha = ChamadoItem & { acoes: AcaoDoChamado[] };

export type AbaDeChamados = "abertos" | "andamento" | "todos";

export const ABAS_DE_CARDS: {
  id: Exclude<AbaDeChamados, "todos">;
  rotulo: string;
  situacao: ChamadoItem["situacao"];
  vazio: string;
}[] = [
  {
    id: "abertos",
    rotulo: "Abertos",
    situacao: "open",
    vazio: "Nenhum chamado aguardando atendimento.",
  },
  {
    id: "andamento",
    rotulo: "Em andamento",
    situacao: "in_progress",
    vazio: "Nenhum chamado em atendimento no momento.",
  },
];

export const PESO_DA_PRIORIDADE: Record<Prioridade, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function abaDoChamado(
  situacao: ChamadoItem["situacao"] | undefined,
): AbaDeChamados {
  if (situacao === "in_progress") return "andamento";
  if (situacao === "open" || situacao === undefined) return "abertos";
  return "todos";
}
