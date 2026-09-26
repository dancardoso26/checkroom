import {
  ABERTURA_EM_MINUTOS,
  FECHAMENTO_EM_MINUTOS,
  minutosParaHora,
  horaParaMinutos,
} from "@/domain/booking/businessHours";
import { combineDateTime, localDayKey, localMinutesOfDay } from "@/lib/datetime";

export type Visao = "calendario" | "tabela";
export type Escala = "dia" | "semana" | "mes";

const VISOES: Visao[] = ["calendario", "tabela"];
const ESCALAS: Escala[] = ["dia", "semana", "mes"];

// As datas circulam como "AAAA-MM-DD" e a conta é feita em UTC: um Date local
// dependeria do fuso do servidor, e o do Vercel não é o de Brasília.
function paraUtc(chave: string): Date {
  const [ano, mes, dia] = chave.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function paraChave(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export function ehChaveValida(texto: string | undefined): texto is string {
  if (!texto || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;

  // 2026-02-31 passa na expressão, mas o Date o transforma em 3 de março.
  return paraChave(paraUtc(texto)) === texto;
}

export function lerVisao(texto: string | undefined): Visao {
  return VISOES.includes(texto as Visao) ? (texto as Visao) : "calendario";
}

export function lerEscala(texto: string | undefined): Escala {
  return ESCALAS.includes(texto as Escala) ? (texto as Escala) : "semana";
}

export function somarDias(chave: string, dias: number): string {
  const data = paraUtc(chave);
  data.setUTCDate(data.getUTCDate() + dias);
  return paraChave(data);
}

/** Segunda é 0 e domingo é 6: a semana acadêmica começa na segunda. */
export function diaDaSemana(chave: string): number {
  return (paraUtc(chave).getUTCDay() + 6) % 7;
}

export function inicioDaSemana(chave: string): string {
  return somarDias(chave, -diaDaSemana(chave));
}

export function diasDaSemana(chave: string): string[] {
  const segunda = inicioDaSemana(chave);
  return Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
}

function primeiroDoMes(chave: string): string {
  return `${chave.slice(0, 7)}-01`;
}

function ultimoDoMes(chave: string): string {
  const data = paraUtc(primeiroDoMes(chave));
  data.setUTCMonth(data.getUTCMonth() + 1);
  data.setUTCDate(0);
  return paraChave(data);
}

// Semanas inteiras, de segunda a domingo: os dias de borda aparecem esmaecidos
// na grade, e sem eles o mês não fecharia em linhas completas.
export function gradeDoMes(chave: string): string[] {
  const inicio = inicioDaSemana(primeiroDoMes(chave));
  const ultimo = ultimoDoMes(chave);
  const fim = somarDias(inicioDaSemana(ultimo), 6);

  const dias: string[] = [];
  for (let dia = inicio; dia <= fim; dia = somarDias(dia, 1)) dias.push(dia);
  return dias;
}

export function mesmoMes(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function diasDoPeriodo(escala: Escala, chave: string): string[] {
  if (escala === "dia") return [chave];
  if (escala === "semana") return diasDaSemana(chave);
  return gradeDoMes(chave);
}

/** A janela consultada no banco, em instantes do horário de Brasília. */
export function intervaloDoPeriodo(
  escala: Escala,
  chave: string
): { inicio: Date; fim: Date } {
  const dias = diasDoPeriodo(escala, chave);

  return {
    inicio: combineDateTime(dias[0], "00:00"),
    fim: combineDateTime(somarDias(dias[dias.length - 1], 1), "00:00"),
  };
}

export function periodoVizinho(
  escala: Escala,
  chave: string,
  direcao: 1 | -1
): string {
  if (escala === "dia") return somarDias(chave, direcao);
  if (escala === "semana") return somarDias(chave, 7 * direcao);

  // O dia 1 como âncora: do 31 de janeiro, "um mês depois" não existe.
  const data = paraUtc(primeiroDoMes(chave));
  data.setUTCMonth(data.getUTCMonth() + direcao);
  return paraChave(data);
}

const nomeDoMes = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  month: "long",
});

const diaPorExtenso = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function tituloDoPeriodo(escala: Escala, chave: string): string {
  if (escala === "dia") return diaPorExtenso.format(paraUtc(chave));

  if (escala === "mes") {
    return `${nomeDoMes.format(paraUtc(chave))} de ${chave.slice(0, 4)}`;
  }

  const [primeiro, , , , , , ultimo] = diasDaSemana(chave);
  const [anoA, , diaA] = primeiro.split("-");
  const [anoB, , diaB] = ultimo.split("-");
  const mesA = nomeDoMes.format(paraUtc(primeiro));
  const mesB = nomeDoMes.format(paraUtc(ultimo));

  if (anoA !== anoB) {
    return `${Number(diaA)} de ${mesA} de ${anoA} a ${Number(diaB)} de ${mesB} de ${anoB}`;
  }

  if (mesA !== mesB) {
    return `${Number(diaA)} de ${mesA} a ${Number(diaB)} de ${mesB} de ${anoB}`;
  }

  return `${Number(diaA)} a ${Number(diaB)} de ${mesB} de ${anoB}`;
}

const cabecalhoDoDia = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "short",
});

/** "seg", "ter"... sem o ponto que o Intl acrescenta. */
export function nomeCurtoDoDia(chave: string): string {
  return cabecalhoDoDia.format(paraUtc(chave)).replace(".", "");
}

export function numeroDoDia(chave: string): number {
  return Number(chave.slice(8, 10));
}

/** Início de cada faixa clicável da grade, de 30 em 30 minutos. */
export function faixasDoExpediente(passo = 30): string[] {
  const faixas: string[] = [];
  for (let m = ABERTURA_EM_MINUTOS; m < FECHAMENTO_EM_MINUTOS; m += passo) {
    faixas.push(minutosParaHora(m));
  }
  return faixas;
}

// Duas aulas seguidas, que é o bloco mais comum da graduação noturna. Nunca
// passa do fechamento, senão o formulário já nasceria recusado.
export function sugerirTermino(inicio: string, duracao = 100): string {
  return minutosParaHora(
    Math.min(horaParaMinutos(inicio) + duracao, FECHAMENTO_EM_MINUTOS)
  );
}

type ComIntervalo = { id: string; startsAt: Date; endsAt: Date };

export type Posicao<T> = {
  item: T;
  /** Minutos desde a abertura. */
  topo: number;
  /** Duração visível, em minutos. */
  altura: number;
  coluna: number;
  colunas: number;
};

// Reservas simultâneas no mesmo dia dividem a largura em vez de se cobrirem.
// Cada grupo de reservas que se tocam, direta ou indiretamente, recebe o
// mesmo número de colunas, e cada reserva ocupa a primeira coluna livre.
export function posicionarNoDia<T extends ComIntervalo>(
  reservas: T[],
  chaveDoDia: string
): Posicao<T>[] {
  const doDia = reservas
    .filter((r) => localDayKey(r.startsAt) === chaveDoDia)
    .map((item) => {
      const inicio = Math.max(localMinutesOfDay(item.startsAt), ABERTURA_EM_MINUTOS);
      const fim = Math.min(localMinutesOfDay(item.endsAt), FECHAMENTO_EM_MINUTOS);
      return { item, inicio, fim: Math.max(fim, inicio + 15) };
    })
    .sort((a, b) => a.inicio - b.inicio || b.fim - a.fim);

  const resultado: Posicao<T>[] = [];
  let grupo: { inicio: number; fim: number; item: T; coluna: number }[] = [];
  let fimDoGrupo = -1;

  function fecharGrupo() {
    const colunas = Math.max(0, ...grupo.map((g) => g.coluna + 1));

    for (const g of grupo) {
      resultado.push({
        item: g.item,
        topo: g.inicio - ABERTURA_EM_MINUTOS,
        altura: g.fim - g.inicio,
        coluna: g.coluna,
        colunas,
      });
    }

    grupo = [];
  }

  for (const atual of doDia) {
    if (atual.inicio >= fimDoGrupo) fecharGrupo();

    // A primeira coluna cuja última reserva já terminou quando esta começa.
    let coluna = 0;
    while (grupo.some((g) => g.coluna === coluna && g.fim > atual.inicio)) {
      coluna++;
    }

    grupo.push({ ...atual, coluna });
    fimDoGrupo = Math.max(fimDoGrupo, atual.fim);
  }

  fecharGrupo();
  return resultado;
}

// O arraste vale nos dois sentidos e encaixa em múltiplos do passo: o início
// arredonda para baixo e o término para cima, sem sair do expediente.
export function intervaloArrastado(
  minutoA: number,
  minutoB: number,
  passo = 15
): { inicio: string; fim: string } {
  const menor = Math.min(minutoA, minutoB);
  const maior = Math.max(minutoA, minutoB);

  const inicio = Math.min(
    Math.max(ABERTURA_EM_MINUTOS, Math.floor(menor / passo) * passo),
    FECHAMENTO_EM_MINUTOS - passo
  );
  const fim = Math.min(
    FECHAMENTO_EM_MINUTOS,
    Math.max(inicio + passo, Math.ceil(maior / passo) * passo)
  );

  return { inicio: minutosParaHora(inicio), fim: minutosParaHora(fim) };
}
