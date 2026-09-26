export const REMETENTE_PADRAO = "CheckRoom <onboarding@resend.dev>";

// Vazio conta como ausente: um .env com "RESEND_FROM=" define a variável como
// texto vazio, o "??" não o substitui, e o Resend recusa o envio com 422.
export function lerRemetente(valor: string | undefined): string {
  return valor?.trim() || REMETENTE_PADRAO;
}
