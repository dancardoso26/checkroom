/** 7h, em minutos desde a meia-noite. */
export const ABERTURA_EM_MINUTOS = 7 * 60;

/** 22h, em minutos desde a meia-noite. */
export const FECHAMENTO_EM_MINUTOS = 22 * 60;

/** Granularidade da grade horária. Uma aula às 19h03 é erro de digitação. */
export const PASSO_EM_MINUTOS = 5;

/** 420 vira "07:00". */
export function minutosParaHora(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const restante = minutos % 60;
  return `${String(horas).padStart(2, "0")}:${String(restante).padStart(2, "0")}`;
}

/** "07:00" vira 420. */
export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(":");
  return Number(h) * 60 + Number(m);
}

export const ABERTURA = minutosParaHora(ABERTURA_EM_MINUTOS);
export const FECHAMENTO = minutosParaHora(FECHAMENTO_EM_MINUTOS);

export const ULTIMO_INICIO = minutosParaHora(
  FECHAMENTO_EM_MINUTOS - PASSO_EM_MINUTOS
);

export const PERIODO_LETIVO_VIGENTE = "2026.2";
