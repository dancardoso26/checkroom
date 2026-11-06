export type ValorOrdenavel =
  string | number | Date | boolean | null | undefined;

export type Ordem = { coluna: string; sentido: "asc" | "desc" };

function comparar(a: ValorOrdenavel, b: ValorOrdenavel): number {
  const vazioA = a === null || a === undefined || a === "";
  const vazioB = b === null || b === undefined || b === "";
  if (vazioA || vazioB) return Number(vazioA) - Number(vazioB);

  const x = a instanceof Date ? a.getTime() : a;
  const y = b instanceof Date ? b.getTime() : b;

  if (typeof x === "number" && typeof y === "number") return x - y;
  if (typeof x === "boolean" && typeof y === "boolean") {
    return Number(x) - Number(y);
  }

  return String(x).localeCompare(String(y), "pt-BR", {
    numeric: true,
    sensitivity: "base",
  });
}

export function ordenarPor<T>(
  itens: T[],
  ordem: Ordem | null,
  colunas: Record<string, (item: T) => ValorOrdenavel>,
): T[] {
  const valor = ordem && colunas[ordem.coluna];
  if (!ordem || !valor) return itens;

  const sinal = ordem.sentido === "asc" ? 1 : -1;

  return itens
    .map((item, posicao) => ({ item, posicao }))
    .sort((a, b) => {
      const va = valor(a.item);
      const vb = valor(b.item);
      const vazioA = va === null || va === undefined || va === "";
      const vazioB = vb === null || vb === undefined || vb === "";

      if (vazioA || vazioB) {
        return comparar(va, vb) || a.posicao - b.posicao;
      }

      return sinal * comparar(va, vb) || a.posicao - b.posicao;
    })
    .map(({ item }) => item);
}

export function proximaOrdem(
  atual: Ordem | null,
  coluna: string,
): Ordem | null {
  if (!atual || atual.coluna !== coluna) return { coluna, sentido: "asc" };
  if (atual.sentido === "asc") return { coluna, sentido: "desc" };
  return null;
}
