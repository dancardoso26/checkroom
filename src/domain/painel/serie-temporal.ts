import {
  ABERTURA_EM_MINUTOS,
  FECHAMENTO_EM_MINUTOS,
} from "@/domain/booking/businessHours";

import { chaveDoDia, dentro, FUSO, UMA_HORA, type Periodo } from "./periodo";

export type PontoDaSerie = { chave: string; rotulo: string } & Record<
  string,
  number | string
>;

const NOMES_DOS_MESES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const LIMITE_DA_SERIE_DIARIA = 62;

export function serieDoPeriodo(
  periodo: Periodo,
  series: Record<string, Date[]>
): PontoDaSerie[] {
  const dias: string[] = [];
  for (
    let cursor = periodo.inicio.getTime();
    cursor < periodo.fim.getTime();
    cursor += 24 * UMA_HORA
  ) {
    dias.push(chaveDoDia(new Date(cursor + 12 * UMA_HORA)));
  }

  const porMes = dias.length > LIMITE_DA_SERIE_DIARIA;
  const chaveDe = (dia: string) => (porMes ? dia.slice(0, 7) : dia);
  const chaves = [...new Set(dias.map(chaveDe))];

  const rotuloDe = (chave: string) => {
    if (porMes) {
      const [ano, mes] = chave.split("-");
      return `${NOMES_DOS_MESES[Number(mes) - 1]}/${ano.slice(2)}`;
    }
    const [, mes, dia] = chave.split("-");
    return `${dia}/${mes}`;
  };

  const pontos = new Map<string, PontoDaSerie>(
    chaves.map((chave) => [
      chave,
      {
        chave,
        rotulo: rotuloDe(chave),
        ...Object.fromEntries(Object.keys(series).map((nome) => [nome, 0])),
      } as PontoDaSerie,
    ])
  );

  for (const [nome, datas] of Object.entries(series)) {
    for (const data of datas) {
      if (!dentro(data, periodo)) continue;
      const ponto = pontos.get(chaveDe(chaveDoDia(data)));
      if (ponto) ponto[nome] = (ponto[nome] as number) + 1;
    }
  }

  return chaves.map((chave) => pontos.get(chave)!);
}

const ROTULO_DO_DIA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const ORDEM_DOS_DIAS = [1, 2, 3, 4, 5, 6, 0];

export type MapaDeCalor = {
  horas: number[];
  linhas: { dia: string; valores: number[] }[];
  maximo: number;
};

export function mapaDeCalor(
  ocupacoes: { inicio: Date; fim: Date }[],
  periodo: Periodo
): MapaDeCalor {
  const primeira = Math.floor(ABERTURA_EM_MINUTOS / 60);
  const ultima = Math.ceil(FECHAMENTO_EM_MINUTOS / 60);
  const horas = Array.from({ length: ultima - primeira }, (_, i) => primeira + i);

  const celulas = new Map<number, number[]>(
    ORDEM_DOS_DIAS.map((dia) => [dia, horas.map(() => 0)])
  );

  for (const ocupacao of ocupacoes) {
    const inicio = Math.max(ocupacao.inicio.getTime(), periodo.inicio.getTime());
    const fim = Math.min(ocupacao.fim.getTime(), periodo.fim.getTime());
    if (fim <= inicio) continue;

    let cursor = inicio;
    while (cursor < fim) {
      const local = new Date(cursor - FUSO);
      const proximaHora = cursor + UMA_HORA - (local.getTime() % UMA_HORA);
      const trecho = Math.min(fim, proximaHora) - cursor;
      const linha = celulas.get(local.getUTCDay());
      const coluna = local.getUTCHours() - primeira;
      if (linha && coluna >= 0 && coluna < horas.length) {
        linha[coluna] += trecho / UMA_HORA;
      }
      cursor += trecho;
    }
  }

  const todas = ORDEM_DOS_DIAS.map((dia) => ({
    dia: ROTULO_DO_DIA[dia],
    valores: celulas.get(dia)!.map((v) => Math.round(v * 10) / 10),
  }));

  const linhas = todas.filter(
    (l) => l.dia !== "Dom" || l.valores.some((v) => v > 0)
  );

  return {
    horas,
    linhas,
    maximo: Math.max(0, ...linhas.flatMap((l) => l.valores)),
  };
}
