// A versão fica aqui, e não na página, para que o aceite gravado no perfil
// possa ser comparado sem importar um componente de tela.
export const VERSAO_DOS_TERMOS = "1.1";
export const VERSAO_DA_POLITICA = "1.1";
export const VIGENTE_DESDE = "26 de setembro de 2026";

// O aceite vale para uma versão dos termos. Mudou a versão, o aceite antigo
// deixa de valer e a tela de aceite volta a aparecer no próximo acesso.
export function aceiteEmDia(versaoAceita: string | null): boolean {
  return versaoAceita === VERSAO_DOS_TERMOS;
}
