"use client";

import { useState } from "react";

import type { PropsDoRodape } from "@/components/paginacao";
import { paginar, TAMANHO_DA_PAGINA } from "@/domain/tabela/tabela";

export function usePaginacao<T>(
  itens: T[],
  porPaginaInicial = TAMANHO_DA_PAGINA
): { visiveis: T[]; rodape: PropsDoRodape } {
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(porPaginaInicial);

  const paginacao = paginar(itens.length, pagina, porPagina);

  return {
    visiveis: itens.slice(paginacao.de, paginacao.ate + 1),
    rodape: {
      pagina: paginacao.pagina,
      totalDePaginas: paginacao.totalDePaginas,
      porPagina,
      total: itens.length,
      onPagina: setPagina,
      onPorPagina: (novo) => {
        setPorPagina(novo);
        setPagina(1);
      },
    },
  };
}

export type Selecao = {
  marcados: string[];
  estaMarcado: (id: string) => boolean;
  alternar: (id: string, marcado: boolean) => void;
  estadoDoCabecalho: boolean | "indeterminate";
  alternarVisiveis: (marcado: boolean) => void;
  limpar: () => void;
};

export function useSelecao(
  idsExistentes: string[],
  idsVisiveis: string[]
): Selecao {
  const [escolhidos, setEscolhidos] = useState<string[]>([]);

  const existentes = new Set(idsExistentes);
  const marcados = escolhidos.filter((id) => existentes.has(id));
  const conjunto = new Set(marcados);

  const visiveisMarcados = idsVisiveis.filter((id) => conjunto.has(id)).length;
  const estadoDoCabecalho =
    idsVisiveis.length > 0 && visiveisMarcados === idsVisiveis.length
      ? true
      : visiveisMarcados > 0
        ? "indeterminate"
        : false;

  return {
    marcados,
    estaMarcado: (id) => conjunto.has(id),
    alternar: (id, marcado) =>
      setEscolhidos((atuais) =>
        marcado
          ? [...atuais.filter((atual) => atual !== id), id]
          : atuais.filter((atual) => atual !== id)
      ),
    estadoDoCabecalho,
    alternarVisiveis: (marcado) =>
      setEscolhidos((atuais) => {
        const semVisiveis = atuais.filter((id) => !idsVisiveis.includes(id));
        return marcado ? [...semVisiveis, ...idsVisiveis] : semVisiveis;
      }),
    limpar: () => setEscolhidos([]),
  };
}

export type ResultadoEmLote = { ok: true } | { ok: false; mensagem: string };

export async function executarEmLote<T>(
  itens: T[],
  acao: (item: T) => Promise<ResultadoEmLote>,
  descrever: (item: T) => string
): Promise<ResultadoEmLote> {
  const falhas: string[] = [];

  for (const item of itens) {
    const resultado = await acao(item);
    if (!resultado.ok) falhas.push(`${descrever(item)}: ${resultado.mensagem}`);
  }

  if (falhas.length === 0) return { ok: true };

  const concluidos = itens.length - falhas.length;
  return {
    ok: false,
    mensagem: `${concluidos} de ${itens.length} concluídos. ${falhas.join(" ")}`,
  };
}
