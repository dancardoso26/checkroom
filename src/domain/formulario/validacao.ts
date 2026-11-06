export type ErrosPorCampo = Partial<Record<string, string[]>>;

export function semErros(erros: ErrosPorCampo): boolean {
  return Object.values(erros).every((lista) => !lista || lista.length === 0);
}
