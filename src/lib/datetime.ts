/**
 * FORMATAÇÃO DE DATA E HORA
 *
 * Um único lugar para transformar instantes em texto legível.
 *
 * POR QUE O FUSO É FIXO
 *
 * As colunas do banco são timestamptz, ou seja, guardam o instante absoluto em
 * UTC. Quem decide em que fuso exibir é a aplicação.
 *
 * Fixar America/Sao_Paulo, em vez de usar o fuso do navegador, é uma decisão de
 * produto: as reservas são de salas físicas de um campus. Uma aula às 19h é às
 * 19h no relógio da parede, e precisa aparecer assim também para um professor
 * que abra o sistema durante uma viagem ao exterior.
 *
 * Também é o que faz o servidor e o navegador concordarem. O servidor da Vercel
 * roda em UTC; se a formatação seguisse o ambiente, a página renderizada no
 * servidor mostraria 22h e o React a corrigiria para 19h ao hidratar, causando
 * um erro de hidratação e um salto visível na tela.
 *
 * Este arquivo não importa nada e não tem efeito colateral, então pode ser
 * usado tanto pelo domínio quanto pelas telas.
 */

const FUSO = "America/Sao_Paulo";
const LOCALE = "pt-BR";

/**
 * Os formatadores são criados uma vez, no carregamento do módulo, e não a cada
 * chamada. Construir um Intl.DateTimeFormat é caro o suficiente para importar
 * quando se formata uma lista inteira de reservas.
 */

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
 * A data no formato que o input type="date" entende, no fuso de Brasília.
 *
 * toISOString() não serve aqui: ele converte para UTC, e uma reserva noturna
 * ficaria com a data do dia seguinte. Às 21h de 14/09 em Brasília já são 00h de
 * 15/09 em UTC.
 *
 * A saída em partes do próprio Intl é o caminho seguro, porque a conversão de
 * fuso e a extração dos números acontecem juntas.
 */
/**
 * O fuso da instituição, fixo.
 *
 * Os campos do formulário trazem "14/09/2026" e "19:00" sem nenhuma informação
 * de fuso, e o servidor da Vercel roda em UTC. Sem esta conversão, uma aula das
 * 19h seria gravada como 19h UTC, ou seja, 16h em Brasília.
 *
 * O deslocamento é constante porque o Brasil não adota horário de verão desde
 * 2019. Se voltar a adotar, esta linha passa a estar errada durante alguns
 * meses do ano, e a correção é trocar a construção manual por uma biblioteca de
 * fuso, como @date-fns/tz, que consulta a base de dados de fusos do sistema.
 *
 * A premissa está escrita aqui justamente para que essa dívida seja encontrável
 * no dia em que precisar ser paga.
 */
const OFFSET_BRASILIA = "-03:00";

/**
 * Junta a data e a hora do formulário em um instante.
 *
 * Fica aqui, e não em cada Server Action, porque a criação e a análise prévia
 * precisam produzir exatamente o mesmo instante a partir dos mesmos campos. Se
 * divergissem, a tela mostraria um espaço como livre e o envio o recusaria.
 */
export function combineDateTime(date: string, time: string): Date {
  // time vem como "19:00" ou "19:00:00" conforme o navegador. Normalizar para
  // segundos evita que a string ISO fique malformada em um deles.
  const horaCompleta = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${horaCompleta}${OFFSET_BRASILIA}`);
}

/**
 * Extrai partes do instante já convertidas para o fuso da instituição.
 *
 * Existe porque as funções nativas de Date (getHours, getDate) leem o fuso da
 * máquina que executa. No servidor da Vercel, que roda em UTC, uma aula das 21h
 * em Brasília responderia "meia-noite do dia seguinte", e qualquer verificação
 * de horário de funcionamento daria o resultado errado.
 */
function partesLocais(instante: Date): { dia: string; minutosDoDia: number } {
  // en-CA produz "AAAA-MM-DD, HH:MM" em formato de 24 horas, que é o mais fácil
  // de fatiar sem ambiguidade.
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

/**
 * Quantos minutos se passaram desde a meia-noite, no fuso da instituição.
 *
 * Ex.: 19:30 em Brasília devolve 1170. É a forma mais simples de comparar
 * horários sem esbarrar em conversão de fuso a cada comparação.
 */
export function localMinutesOfDay(instante: Date): number {
  return partesLocais(instante).minutosDoDia;
}

/**
 * O dia do calendário, no fuso da instituição, como "AAAA-MM-DD".
 *
 * Serve para responder "estes dois instantes caem no mesmo dia?", pergunta que
 * toDateInputValue também responde, mas que aqui aparece com o nome do que se
 * quer saber.
 */
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

  // O locale en-CA produz exatamente "AAAA-MM-DD", que é o formato exigido pelo
  // input. É um atalho conhecido e mais confiável do que montar a string à mão.
  return partes;
}
