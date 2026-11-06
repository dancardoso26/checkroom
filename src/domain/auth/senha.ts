export const TAMANHO_MINIMO_DA_SENHA = 8;
export const TAMANHO_MAXIMO_DA_SENHA = 72;

export const SIMBOLOS_ACEITOS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";

export type RegraDaSenha = {
  id: "tamanho" | "maiuscula" | "minuscula" | "numero" | "simbolo";
  descricao: string;
  cumpre: (senha: string) => boolean;
};

export const REGRAS_DA_SENHA: readonly RegraDaSenha[] = [
  {
    id: "tamanho",
    descricao: `Ao menos ${TAMANHO_MINIMO_DA_SENHA} caracteres`,
    cumpre: (senha) => senha.length >= TAMANHO_MINIMO_DA_SENHA,
  },
  {
    id: "maiuscula",
    descricao: "Uma letra maiúscula",
    cumpre: (senha) => /[A-Z]/.test(senha),
  },
  {
    id: "minuscula",
    descricao: "Uma letra minúscula",
    cumpre: (senha) => /[a-z]/.test(senha),
  },
  {
    id: "numero",
    descricao: "Um número",
    cumpre: (senha) => /[0-9]/.test(senha),
  },
  {
    id: "simbolo",
    descricao: "Um símbolo, como ! @ # ou -",
    cumpre: (senha) => [...senha].some((c) => SIMBOLOS_ACEITOS.includes(c)),
  },
];

export type AvaliacaoDaRegra = Pick<RegraDaSenha, "id" | "descricao"> & {
  cumprida: boolean;
};

export function avaliarSenha(senha: string): AvaliacaoDaRegra[] {
  return REGRAS_DA_SENHA.map(({ id, descricao, cumpre }) => ({
    id,
    descricao,
    cumprida: cumpre(senha),
  }));
}

export function regrasNaoCumpridas(senha: string): string[] {
  return avaliarSenha(senha)
    .filter((regra) => !regra.cumprida)
    .map((regra) => regra.descricao.toLowerCase());
}

export function senhaForte(senha: string): boolean {
  return regrasNaoCumpridas(senha).length === 0;
}
