import type { ErrosPorCampo } from "@/domain/formulario/validacao";

export type PeriodoLetivo = {
  id: string;
  codigo: string;
  inicio: string;
  fim: string;
};

export type Bloqueio = {
  id: string;
  inicio: string;
  fim: string;
  espacoId: string | null;
  motivo: string;
};

export type CalendarioDoDia = {
  periodo: { codigo: string } | null;
  bloqueios: Pick<Bloqueio, "espacoId" | "motivo">[];
};

const FORMATO_DO_CODIGO = /^\d{4}\.[12]$/;
const FORMATO_DA_DATA = /^\d{4}-\d{2}-\d{2}$/;

export function contemDia(intervalo: { inicio: string; fim: string }, dia: string): boolean {
  return intervalo.inicio <= dia && dia <= intervalo.fim;
}

export function periodoDoDia<T extends { inicio: string; fim: string }>(
  periodos: T[],
  dia: string
): T | null {
  return periodos.find((p) => contemDia(p, dia)) ?? null;
}

export function calendarioDoDia(
  periodos: PeriodoLetivo[],
  bloqueios: Bloqueio[],
  dia: string
): CalendarioDoDia {
  const periodo = periodoDoDia(periodos, dia);

  return {
    periodo: periodo ? { codigo: periodo.codigo } : null,
    bloqueios: bloqueios
      .filter((b) => contemDia(b, dia))
      .map(({ espacoId, motivo }) => ({ espacoId, motivo })),
  };
}

export function validarPeriodo(
  dados: Omit<PeriodoLetivo, "id"> & { id: string | null },
  existentes: PeriodoLetivo[]
): ErrosPorCampo {
  const erros: ErrosPorCampo = {};

  if (!FORMATO_DO_CODIGO.test(dados.codigo.trim())) {
    erros.codigo = ["Informe o período no formato ano.semestre, como 2027.1."];
  } else if (
    existentes.some((p) => p.id !== dados.id && p.codigo === dados.codigo.trim())
  ) {
    erros.codigo = ["Este período já está cadastrado."];
  }

  if (!FORMATO_DA_DATA.test(dados.inicio)) erros.inicio = ["Informe a data de início."];
  if (!FORMATO_DA_DATA.test(dados.fim)) erros.fim = ["Informe a data de término."];

  if (!erros.inicio && !erros.fim) {
    if (dados.fim <= dados.inicio) {
      erros.fim = ["O término deve ser depois do início."];
    } else {
      const sobreposto = existentes.find(
        (p) => p.id !== dados.id && p.inicio <= dados.fim && dados.inicio <= p.fim
      );
      if (sobreposto) {
        erros.inicio = [`As datas cruzam o período ${sobreposto.codigo}.`];
      }
    }
  }

  return erros;
}

export function validarBloqueio(
  dados: Omit<Bloqueio, "id"> & { id: string | null }
): ErrosPorCampo {
  const erros: ErrosPorCampo = {};

  if (!FORMATO_DA_DATA.test(dados.inicio)) erros.inicio = ["Informe a data de início."];
  if (!FORMATO_DA_DATA.test(dados.fim)) erros.fim = ["Informe a data de término."];
  if (!erros.inicio && !erros.fim && dados.fim < dados.inicio) {
    erros.fim = ["O término não pode ser antes do início."];
  }

  const motivo = dados.motivo.trim();
  if (motivo === "") erros.motivo = ["Informe o motivo, como o nome do feriado."];
  else if (motivo.length > 200) erros.motivo = ["Use no máximo 200 caracteres."];

  return erros;
}
