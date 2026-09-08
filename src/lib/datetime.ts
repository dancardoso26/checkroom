/**
 * Formatação de data e hora, com o fuso fixo em America/Sao_Paulo.
 *
 * O banco guarda instantes em UTC e a aplicação decide como exibir. Fixar o fuso
 * é decisão de produto: uma aula às 19h é às 19h no relógio da parede, mesmo
 * para quem abra o sistema de outro país.
 *
 * Também é o que faz servidor e navegador concordarem. A Vercel roda em UTC, e
 * seguir o ambiente causaria erro de hidratação com salto visível na tela.
 */

const FUSO = "America/Sao_Paulo";
const LOCALE = "pt-BR";

// Criados uma vez, e não a cada chamada: construir um Intl.DateTimeFormat é
// caro o bastante para importar ao formatar uma lista inteira.

/** Ex.: "14/09/2026" */
const dataCompleta = new Intl.DateTimeFormat(LOCALE, {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Ex.: "segunda-feira, 14 de setembro" */
const dataPorExtenso = new Intl.DateTimeFormat(LOCALE, {
  timeZone: FUSO,
  weekday: "long",
  day: "2-digit",
  month: "long",
});

/** Ex.: "14/09, 19:00" */
const dataCurtaComHora = new Intl.DateTimeFormat(LOCALE, {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Ex.: "19:00" */
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

/** Ex.: "14/09, 19:00 às 20:40" */
export function formatPeriod(inicio: Date, fim: Date): string {
  return `${formatShortDateTime(inicio)} às ${formatTime(fim)}`;
}

/** Ex.: "19:00 às 20:40" */
export function formatTimeRange(inicio: Date, fim: Date): string {
  return `${formatTime(inicio)} às ${formatTime(fim)}`;
}

/**
 * Deslocamento fixo, válido porque o Brasil não adota horário de verão desde
 * 2019. Se voltar a adotar, esta linha fica errada por alguns meses do ano e a
 * correção é usar uma biblioteca de fuso, como @date-fns/tz.
 */
const OFFSET_BRASILIA = "-03:00";

/**
 * A criação e a análise prévia precisam produzir o mesmo instante a partir dos
 * mesmos campos, senão a tela mostraria livre o que o envio recusaria.
 */
export function combineDateTime(date: string, time: string): Date {
  // time vem como "19:00" ou "19:00:00" conforme o navegador. Normalizar para
  // segundos evita que a string ISO fique malformada em um deles.
  const horaCompleta = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${horaCompleta}${OFFSET_BRASILIA}`);
}

/**
 * getHours e getDate leem o fuso da máquina. No servidor, em UTC, uma aula das
 * 21h em Brasília responderia "meia-noite do dia seguinte".
 */
function partesLocais(instante: Date): { dia: string; minutosDoDia: number } {
  // en-CA produz "AAAA-MM-DD, HH:MM" em 24 horas, sem ambiguidade.
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

/** Minutos desde a meia-noite no fuso da instituição: 19:30 devolve 1170. */
export function localMinutesOfDay(instante: Date): number {
  return partesLocais(instante).minutosDoDia;
}

/** O dia do calendário no fuso da instituição, para comparar duas datas. */
export function localDayKey(instante: Date): string {
  return partesLocais(instante).dia;
}

/**
 * A data no formato do input type="date". toISOString não serve: converte para
 * UTC, e às 21h de 14/09 em Brasília já são 00h de 15/09.
 */
export function toDateInputValue(instante: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);

  // en-CA produz exatamente "AAAA-MM-DD", o formato exigido pelo input.
  return partes;
}
