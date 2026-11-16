const FUSO = "America/Sao_Paulo";
const IDIOMA = "pt-BR";

const dataCompleta = new Intl.DateTimeFormat(IDIOMA, {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dataPorExtenso = new Intl.DateTimeFormat(IDIOMA, {
  timeZone: FUSO,
  weekday: "long",
  day: "2-digit",
  month: "long",
});

const dataCurtaComHora = new Intl.DateTimeFormat(IDIOMA, {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const hora = new Intl.DateTimeFormat(IDIOMA, {
  timeZone: FUSO,
  hour: "2-digit",
  minute: "2-digit",
});

export function formatarData(instante: Date): string {
  return dataCompleta.format(instante);
}

export function formatarDataPorExtenso(instante: Date): string {
  return dataPorExtenso.format(instante);
}

export function formatarHora(instante: Date): string {
  return hora.format(instante);
}

export function formatarDataCurtaComHora(instante: Date): string {
  return dataCurtaComHora.format(instante);
}

export function formatarDataEHora(instante: Date): string {
  return `${formatarData(instante)}, ${formatarHora(instante)}`;
}

export function formatarPeriodo(inicio: Date, fim: Date): string {
  return `${formatarDataCurtaComHora(inicio)} às ${formatarHora(fim)}`;
}

export function formatarIntervaloDeHoras(inicio: Date, fim: Date): string {
  return `${formatarHora(inicio)} às ${formatarHora(fim)}`;
}

const DESLOCAMENTO_DE_BRASILIA = "-03:00";

export function combinarDataEHora(data: string, hora: string): Date {
  const horaCompleta = hora.length === 5 ? `${hora}:00` : hora;
  return new Date(`${data}T${horaCompleta}${DESLOCAMENTO_DE_BRASILIA}`);
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

export function minutosDoDiaLocal(instante: Date): number {
  return partesLocais(instante).minutosDoDia;
}

export function chaveDoDiaLocal(instante: Date): string {
  return partesLocais(instante).dia;
}

export function valorDoCampoDeData(instante: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);

  return partes;
}
