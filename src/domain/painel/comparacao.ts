export type TomDaComparacao = "bom" | "ruim" | "neutro";

export type Comparacao = {
  valor: number | null;
  unidade: "percentual" | "pontos";
  tom: TomDaComparacao;
};

export function compararComAnterior(
  atual: number | null,
  anterior: number | null,
  opcoes: {
    unidade: "percentual" | "pontos";
    melhorQuando: "subir" | "descer" | "neutro";
  }
): Comparacao {
  const { unidade, melhorQuando } = opcoes;

  let valor: number | null = null;
  if (atual !== null && anterior !== null) {
    if (unidade === "pontos") {
      valor = Math.round((atual - anterior) * 1000) / 10;
    } else if (anterior === 0) {
      valor = atual === 0 ? 0 : null;
    } else {
      valor = Math.round(((atual - anterior) / anterior) * 1000) / 10;
    }
  }

  let tom: TomDaComparacao = "neutro";
  if (valor !== null && valor !== 0 && melhorQuando !== "neutro") {
    const subiu = valor > 0;
    tom = subiu === (melhorQuando === "subir") ? "bom" : "ruim";
  }

  return { valor, unidade, tom };
}
