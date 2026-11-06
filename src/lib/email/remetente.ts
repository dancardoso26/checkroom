export const REMETENTE_PADRAO = "CheckRoom <onboarding@resend.dev>";

export function lerRemetente(valor: string | undefined): string {
  return valor?.trim() || REMETENTE_PADRAO;
}
