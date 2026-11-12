export const VERSAO_DOS_TERMOS = "1.3";
export const VERSAO_DA_POLITICA = "1.3";
export const VIGENTE_DESDE = "12 de novembro de 2026";

export function aceiteEmDia(versaoAceita: string | null): boolean {
  return versaoAceita === VERSAO_DOS_TERMOS;
}
