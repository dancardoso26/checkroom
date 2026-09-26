export type FiltroDeStatus = "agendadas" | "canceladas" | "todas";

export type Filtros = {
  status: FiltroDeStatus;
  /** Nulo mostra as reservas de todos os professores. */
  professor: string | null;
};

export const FILTROS_PADRAO: Filtros = { status: "agendadas", professor: null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function lerFiltros(parametros: {
  status?: string;
  professor?: string;
}): Filtros {
  const status = parametros.status;

  return {
    status:
      status === "canceladas" || status === "todas" ? status : "agendadas",
    professor:
      parametros.professor && UUID.test(parametros.professor)
        ? parametros.professor
        : null,
  };
}

// No painel o status é um par de caixas; na URL, um valor só.
export function caixasDoStatus(status: FiltroDeStatus) {
  return {
    agendadas: status !== "canceladas",
    canceladas: status !== "agendadas",
  };
}

// Nenhuma caixa marcada não mostraria nada, então volta ao padrão.
export function statusDasCaixas(caixas: {
  agendadas: boolean;
  canceladas: boolean;
}): FiltroDeStatus {
  if (caixas.agendadas && caixas.canceladas) return "todas";
  if (caixas.canceladas) return "canceladas";
  return "agendadas";
}

export function contarFiltrosAtivos(filtros: Filtros): number {
  return (
    (filtros.status !== FILTROS_PADRAO.status ? 1 : 0) +
    (filtros.professor ? 1 : 0)
  );
}
