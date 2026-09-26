export const ORDENACOES = [
  "data",
  "atividade",
  "espaco",
  "professor",
  "turma",
  "situacao",
] as const;

export type Ordenacao = (typeof ORDENACOES)[number];
export type Sentido = "asc" | "desc";

export type EstadoDaTabela = {
  pagina: number;
  ordenar: Ordenacao;
  sentido: Sentido;
  porPagina: number;
};

export const TAMANHO_DA_PAGINA = 25;

// Fora do componente de paginação, que é "use client": uma página de servidor
// não pode importar valores de um módulo de cliente, só componentes.
export const OPCOES_POR_PAGINA = [10, 25, 50, 100];

// Só os tamanhos oferecidos: um valor digitado na URL não pode pedir 100 mil.
export function lerPorPagina(texto: string | undefined): number {
  const numero = Number(texto);
  return OPCOES_POR_PAGINA.includes(numero) ? numero : TAMANHO_DA_PAGINA;
}

// Mais recentes primeiro: com o histórico inteiro na tabela, começar pela
// reserva mais antiga esconderia justamente as que importam agora.
export const TABELA_PADRAO: EstadoDaTabela = {
  pagina: 1,
  ordenar: "data",
  sentido: "desc",
  porPagina: TAMANHO_DA_PAGINA,
};

export function lerTabela(parametros: {
  pagina?: string;
  ordenar?: string;
  sentido?: string;
  porPagina?: string;
}): EstadoDaTabela {
  const pagina = Number(parametros.pagina);

  return {
    pagina: Number.isInteger(pagina) && pagina >= 1 ? pagina : 1,
    ordenar: ORDENACOES.includes(parametros.ordenar as Ordenacao)
      ? (parametros.ordenar as Ordenacao)
      : TABELA_PADRAO.ordenar,
    sentido:
      parametros.sentido === "asc"
        ? "asc"
        : parametros.sentido === "desc"
          ? "desc"
          : TABELA_PADRAO.sentido,
    porPagina: lerPorPagina(parametros.porPagina),
  };
}

// Clicar na coluna já ordenada inverte o sentido; clicar em outra começa pelo
// sentido mais útil dela: datas das mais recentes, textos de A a Z.
export function alternarOrdenacao(
  atual: EstadoDaTabela,
  coluna: Ordenacao
): EstadoDaTabela {
  if (atual.ordenar === coluna) {
    return {
      ...atual,
      pagina: 1,
      sentido: atual.sentido === "asc" ? "desc" : "asc",
    };
  }

  return {
    ...atual,
    pagina: 1,
    ordenar: coluna,
    sentido: coluna === "data" ? "desc" : "asc",
  };
}

export type Paginacao = {
  pagina: number;
  totalDePaginas: number;
  /** Índices para o range do banco, com o fim inclusivo. */
  de: number;
  ate: number;
  temAnterior: boolean;
  temSeguinte: boolean;
};

// A página pedida é trazida para dentro do intervalo: um link salvo para a
// página 9 continua funcionando depois que as reservas diminuírem.
export function paginar(
  total: number,
  pagina: number,
  tamanho = TAMANHO_DA_PAGINA
): Paginacao {
  const totalDePaginas = Math.max(1, Math.ceil(total / tamanho));
  const atual = Math.min(Math.max(1, Math.trunc(pagina) || 1), totalDePaginas);
  const de = (atual - 1) * tamanho;

  return {
    pagina: atual,
    totalDePaginas,
    de,
    ate: de + tamanho - 1,
    temAnterior: atual > 1,
    temSeguinte: atual < totalDePaginas,
  };
}
