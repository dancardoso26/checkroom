// Domínios que não recebem e-mail de verdade. Enviar para eles gera devolução,
// e devoluções seguidas derrubam a reputação do domínio remetente no Resend.
const DOMINIOS_FICTICIOS = ["exemplo.edu.br", "example.com", "example.org", "example.net"];

// Terminações reservadas pela RFC 2606 e RFC 6761 para teste e documentação.
const TERMINACOES_RESERVADAS = [".invalid", ".test", ".example", ".localhost"];

export function podeReceber(email: string | null | undefined): boolean {
  const endereco = email?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(endereco)) return false;

  const dominio = endereco.split("@")[1];

  if (DOMINIOS_FICTICIOS.some((d) => dominio === d || dominio.endsWith(`.${d}`))) {
    return false;
  }

  return !TERMINACOES_RESERVADAS.some((t) => dominio.endsWith(t));
}
