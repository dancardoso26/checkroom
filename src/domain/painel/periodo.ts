export type Periodo = { inicio: Date; fim: Date };

export const UM_DIA = 24 * 60 * 60 * 1000;

export const UMA_HORA = 60 * 60 * 1000;

export const FUSO = 3 * UMA_HORA;

export function chaveDoDia(data: Date): string {
  return new Date(data.getTime() - FUSO).toISOString().slice(0, 10);
}

export function dentro(data: Date, periodo: Periodo): boolean {
  return data >= periodo.inicio && data < periodo.fim;
}

export function diasLetivos(periodo: Periodo): number {
  let dias = 0;

  const cursor = new Date(periodo.inicio.getTime() + 12 * 60 * 60 * 1000);
  while (cursor < periodo.fim) {
    const diaDaSemana = new Date(cursor.getTime() - 3 * 60 * 60 * 1000).getUTCDay();
    if (diaDaSemana !== 0) dias += 1;
    cursor.setTime(cursor.getTime() + UM_DIA);
  }

  return dias;
}

export function horasDentro(ocupacao: { inicio: Date; fim: Date }, periodo: Periodo): number {
  const inicio = Math.max(ocupacao.inicio.getTime(), periodo.inicio.getTime());
  const fim = Math.min(ocupacao.fim.getTime(), periodo.fim.getTime());
  return Math.max(0, fim - inicio) / (60 * 60 * 1000);
}

export function periodoAnterior(periodo: Periodo): Periodo {
  const inicio = new Date(periodo.inicio.getTime() - FUSO);
  const fim = new Date(periodo.fim.getTime() - FUSO);

  const viraDeMes = (data: Date) =>
    data.getUTCDate() === 1 && data.getTime() % (24 * UMA_HORA) === 0;

  if (viraDeMes(inicio) && viraDeMes(fim)) {
    const meses =
      (fim.getUTCFullYear() - inicio.getUTCFullYear()) * 12 +
      fim.getUTCMonth() -
      inicio.getUTCMonth();

    return {
      inicio: new Date(
        Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() - meses, 1) + FUSO
      ),
      fim: periodo.inicio,
    };
  }

  const duracao = periodo.fim.getTime() - periodo.inicio.getTime();
  return { inicio: new Date(periodo.inicio.getTime() - duracao), fim: periodo.inicio };
}

export function diasDoPeriodo(periodo: Periodo): { de: string; ate: string } {
  return {
    de: chaveDoDia(periodo.inicio),
    ate: chaveDoDia(new Date(periodo.fim.getTime() - 1)),
  };
}

export function lerPeriodo(
  de: string | undefined,
  ate: string | undefined,
  hoje: string
): { de: string; ate: string; periodo: Periodo } {
  const data = /^\d{4}-\d{2}-\d{2}$/;
  const [ano, mes] = hoje.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();

  let inicio = de && data.test(de) ? de : `${hoje.slice(0, 7)}-01`;
  let fim = ate && data.test(ate) ? ate : `${hoje.slice(0, 7)}-${String(ultimoDia).padStart(2, "0")}`;
  if (fim < inicio) [inicio, fim] = [fim, inicio];

  return {
    de: inicio,
    ate: fim,
    periodo: {
      inicio: new Date(`${inicio}T00:00:00-03:00`),
      fim: new Date(new Date(`${fim}T00:00:00-03:00`).getTime() + UM_DIA),
    },
  };
}
