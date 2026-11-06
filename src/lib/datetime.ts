const FUSO = "America/Sao_Paulo";
const LOCALE = "pt-BR";

const dataCompleta = new Intl.DateTimeFormat(LOCALE, {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dataPorExtenso = new Intl.DateTimeFormat(LOCALE, {
  timeZone: FUSO,
  weekday: "long",
  day: "2-digit",
  month: "long",
});

const dataCurtaComHora = new Intl.DateTimeFormat(LOCALE, {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const hora = new Intl.DateTimeFormat(LOCALE, {
  timeZone: FUSO,
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(instante: Date): string {
  return dataCompleta.format(instante);
}

export function formatFullDate(instante: Date): string {
  return dataPorExtenso.format(instante);
}

export function formatTime(instante: Date): string {
  return hora.format(instante);
}

export function formatShortDateTime(instante: Date): string {
  return dataCurtaComHora.format(instante);
}

export function formatDateTime(instante: Date): string {
  return `${formatDate(instante)}, ${formatTime(instante)}`;
}

export function formatPeriod(inicio: Date, fim: Date): string {
  return `${formatShortDateTime(inicio)} às ${formatTime(fim)}`;
}

export function formatTimeRange(inicio: Date, fim: Date): string {
  return `${formatTime(inicio)} às ${formatTime(fim)}`;
}

const OFFSET_BRASILIA = "-03:00";

export function combineDateTime(date: string, time: string): Date {
  const horaCompleta = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${horaCompleta}${OFFSET_BRASILIA}`);
}

function partesLocais(instante: Date): { dia: string; minutosDoDia: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instante);

  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((p) => p.type === tipo)?.value ?? "0";

  return {
    dia: `${valor("year")}-${valor("month")}-${valor("day")}`,
    minutosDoDia: Number(valor("hour")) * 60 + Number(valor("minute")),
  };
}

export function localMinutesOfDay(instante: Date): number {
  return partesLocais(instante).minutosDoDia;
}

export function localDayKey(instante: Date): string {
  return partesLocais(instante).dia;
}

export function toDateInputValue(instante: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);

  return partes;
}
