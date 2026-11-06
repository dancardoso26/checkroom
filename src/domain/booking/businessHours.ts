export const ABERTURA_EM_MINUTOS = 7 * 60;

export const FECHAMENTO_EM_MINUTOS = 22 * 60;

export const PASSO_EM_MINUTOS = 5;

export function minutosParaHora(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const restante = minutos % 60;
  return `${String(horas).padStart(2, "0")}:${String(restante).padStart(2, "0")}`;
}

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
