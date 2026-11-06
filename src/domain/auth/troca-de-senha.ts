const METODOS_DO_LINK = ["recovery", "invite", "otp", "magiclink"];

type Claims = { aal?: string; amr?: unknown } | null | undefined;

export function podeTrocarSenha(claims: Claims): boolean {
  if (!claims) return false;
  if (claims.aal === "aal2") return true;

  const metodos = Array.isArray(claims.amr)
    ? claims.amr.map((m) =>
        typeof m === "string" ? m : (m as { method?: string })?.method
      )
    : [];

  return metodos.some((m) => m !== undefined && METODOS_DO_LINK.includes(m));
}
