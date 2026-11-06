"use client";

import { useState } from "react";

import {
  ordenarPor,
  proximaOrdem,
  type Ordem,
  type ValorOrdenavel,
} from "@/domain/tabela/ordenacao";

export type ControleDeOrdem = {
  ordem: Ordem | null;
  alternar: (coluna: string) => void;
};

export function useOrdenacao<T>(
  itens: T[],
  colunas: Record<string, (item: T) => ValorOrdenavel>,
): { ordenados: T[]; controle: ControleDeOrdem } {
  const [ordem, setOrdem] = useState<Ordem | null>(null);

  return {
    ordenados: ordenarPor(itens, ordem, colunas),
    controle: {
      ordem,
      alternar: (coluna) => setOrdem((atual) => proximaOrdem(atual, coluna)),
    },
  };
}
