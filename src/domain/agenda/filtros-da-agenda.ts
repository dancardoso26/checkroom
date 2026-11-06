import type { ActivityType } from "@/domain/booking/types";

export const TIPOS_DE_ATIVIDADE: ActivityType[] = [
  "class",
  "lecture",
  "exam",
  "event",
];

export const STATUS_DA_RESERVA = [
  "agendadas",
  "concluidas",
  "canceladas",
] as const;

export type StatusDoFiltro = (typeof STATUS_DA_RESERVA)[number];

export type Filtros = {
  status: StatusDoFiltro[];
  professores: string[];
  turmas: string[];
  espacos: string[];
  tipos: ActivityType[];
  minhas: boolean | null;
};

export const FILTROS_PADRAO: Filtros = {
  status: ["agendadas"],
  professores: [],
  turmas: [],
  espacos: [],
  tipos: [],
  minhas: null,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function lista(valor: string | undefined): string[] {
  return valor ? valor.split(",").map((item) => item.trim()) : [];
}

export function lerFiltros(
  parametros: {
    status?: string;
    professor?: string;
    turma?: string;
    espaco?: string;
    atividade?: string;
    minhas?: string;
  },
  ehProfessor = false,
): Filtros {
  const pedidos = lista(parametros.status);
  const status = pedidos.includes("todas")
    ? [...STATUS_DA_RESERVA]
    : STATUS_DA_RESERVA.filter((s) => pedidos.includes(s));

  const professores = [...new Set(lista(parametros.professor))].filter((id) =>
    UUID.test(id),
  );

  const minhas = !ehProfessor
    ? null
    : parametros.minhas === "0"
      ? false
      : parametros.minhas === "1" || professores.length === 0;

  return {
    status: status.length > 0 ? status : [...FILTROS_PADRAO.status],
    professores: minhas ? [] : professores,
    turmas: [...new Set(lista(parametros.turma))].filter((id) => UUID.test(id)),
    espacos: [...new Set(lista(parametros.espaco))].filter((id) =>
      UUID.test(id),
    ),
    tipos: TIPOS_DE_ATIVIDADE.filter((t) =>
      lista(parametros.atividade).includes(t),
    ),
    minhas,
  };
}

export function aplicarMinhas(
  filtros: Filtros,
  professorId: string | null,
): Filtros {
  if (!filtros.minhas || !professorId) return filtros;
  return { ...filtros, professores: [professorId] };
}

export function incluiAgendadas(filtros: Filtros): boolean {
  return (
    filtros.status.length === 0 ||
    filtros.status.includes("agendadas") ||
    filtros.status.includes("concluidas")
  );
}

export function condicaoDeStatus(
  filtros: Filtros,
  agora: Date,
  distinguirConcluidas: boolean,
): string | null {
  if (filtros.status.length === 0) return null;

  const agendadas = filtros.status.includes("agendadas");
  const concluidas = filtros.status.includes("concluidas");
  const canceladas = filtros.status.includes("canceladas");

  if (!distinguirConcluidas) {
    const ativas = agendadas || concluidas;
    if (ativas && canceladas) return null;
    return ativas ? "status.eq.active" : "status.eq.cancelled";
  }

  if (agendadas && concluidas && canceladas) return null;

  const instante = agora.toISOString();
  const partes: string[] = [];
  if (agendadas) partes.push(`and(status.eq.active,ends_at.gt.${instante})`);
  if (concluidas) partes.push(`and(status.eq.active,ends_at.lte.${instante})`);
  if (canceladas) partes.push("status.eq.cancelled");

  return partes.join(",");
}

function statusPadrao(filtros: Filtros): boolean {
  return filtros.status.length === 1 && filtros.status[0] === "agendadas";
}

export function contarFiltrosAtivos(filtros: Filtros): number {
  return (
    (statusPadrao(filtros) ? 0 : 1) +
    (filtros.professores.length > 0 ? 1 : 0) +
    (filtros.turmas.length > 0 ? 1 : 0) +
    (filtros.espacos.length > 0 ? 1 : 0) +
    (filtros.tipos.length > 0 ? 1 : 0) +
    (filtros.minhas ? 1 : 0)
  );
}
