// Contas que entram sem segundo fator, para agilizar o desenvolvimento. Nunca
// valem em produção: o build define NODE_ENV como production e a lista some.
export function dispensaSegundoFator(
  email: string | undefined,
  ambiente: { NODE_ENV?: string; MFA_DISPENSADO_PARA?: string } = process.env
): boolean {
  if (ambiente.NODE_ENV === "production" || !email) return false;

  const dispensadas = (ambiente.MFA_DISPENSADO_PARA ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return dispensadas.includes(email.toLowerCase());
}
