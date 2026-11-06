export const numero = new Intl.NumberFormat("pt-BR");

export const porcentagem = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 0,
});

export const horas = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function variacao(comparacao: {
  valor: number | null;
  unidade: "percentual" | "pontos";
}): string {
  const { valor, unidade } = comparacao;

  if (valor === null) return "Sem base no período anterior";
  if (valor === 0) return "Igual ao período anterior";

  const modulo = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
    Math.abs(valor)
  );
  const sufixo = unidade === "pontos" ? " p.p." : "%";
  return `${modulo}${sufixo} vs. período anterior`;
}

export function intervaloEmTexto(de: string, ate: string): string {
  const formatar = (dia: string) => dia.split("-").reverse().join("/");
  return `${formatar(de)} a ${formatar(ate)}`;
}

export function participacao(parte: number, total: number): string {
  if (total <= 0 || parte <= 0) return "0%";
  const fracao = parte / total;
  return fracao < 0.01 ? "<1%" : porcentagem.format(fracao);
}

export function plural(quantidade: number, singular: string, plural: string): string {
  return `${numero.format(quantidade)} ${quantidade === 1 ? singular : plural}`;
}
