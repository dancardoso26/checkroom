export const VERSAO_DOS_TERMOS = "1.2";
export const VERSAO_DA_POLITICA = "1.2";
export const VIGENTE_DESDE = "12 de outubro de 2026";

export function aceiteEmDia(versaoAceita: string | null): boolean {
  return versaoAceita === VERSAO_DOS_TERMOS;
}
