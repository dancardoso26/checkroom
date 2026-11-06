import {
  ABERTURA_EM_MINUTOS,
  FECHAMENTO_EM_MINUTOS,
} from "@/domain/booking/businessHours";

import type { OcupacaoBruta } from "./tipos";
import { diasLetivos, horasDentro, type Periodo } from "./periodo";

const HORAS_POR_DIA = (FECHAMENTO_EM_MINUTOS - ABERTURA_EM_MINUTOS) / 60;

export type OcupacaoDoEspaco = {
  espacoId: string;
  nome: string;
  horas: number;
  taxa: number;
};

export function ocupacaoPorEspaco(
  espacos: { id: string; nome: string }[],
  ocupacoes: OcupacaoBruta[],
  periodo: Periodo
): OcupacaoDoEspaco[] {
  const disponivel = diasLetivos(periodo) * HORAS_POR_DIA;

  return espacos
    .map((espaco) => {
      const horas = ocupacoes
        .filter((o) => o.espacoId === espaco.id)
        .reduce((soma, o) => soma + horasDentro(o, periodo), 0);

      return {
        espacoId: espaco.id,
        nome: espaco.nome,
        horas: Math.round(horas * 10) / 10,
        taxa: disponivel > 0 ? Math.min(1, horas / disponivel) : 0,
      };
    })
    .sort((a, b) => b.horas - a.horas || a.nome.localeCompare(b.nome, "pt-BR"));
}

export function taxaMediaDeOcupacao(ocupacao: OcupacaoDoEspaco[]): number {
  if (ocupacao.length === 0) return 0;
  return ocupacao.reduce((soma, o) => soma + o.taxa, 0) / ocupacao.length;
}

export function espacosOciosos(
  ocupacao: OcupacaoDoEspaco[],
  limite = 0.05
): OcupacaoDoEspaco[] {
  return ocupacao.filter((o) => o.taxa < limite).sort((a, b) => a.horas - b.horas);
}
