"use client";

import { useState } from "react";

import type { Pesquisa } from "@/components/cadastro";
import { correspondeABusca } from "@/domain/tabela/busca";

export function usePesquisa<T>(
  itens: T[],
  campos: (item: T) => (string | number | null | undefined)[],
  rotulo: string
): { filtrados: T[]; pesquisa: Pesquisa; pesquisando: boolean } {
  const [valor, setValor] = useState("");

  const filtrados = valor.trim()
    ? itens.filter((item) =>
        correspondeABusca(
          campos(item).map((campo) =>
            campo === null || campo === undefined ? null : String(campo)
          ),
          valor
        )
      )
    : itens;

  return {
    filtrados,
    pesquisa: { valor, onMudar: setValor, rotulo },
    pesquisando: valor.trim().length > 0,
  };
}
