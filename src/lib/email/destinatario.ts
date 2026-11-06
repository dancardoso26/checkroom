const DOMINIOS_FICTICIOS = [
  "exemplo.edu.br",
  "example.com",
  "example.org",
  "example.net",
];

const ENDERECOS_DE_TESTE = [
  "adm@umc.br",
  "professor@umc.br",
  "aluno@umc.br",
  "suporte@umc.br",
];

const TERMINACOES_RESERVADAS = [".invalid", ".test", ".example", ".localhost"];

export function podeReceber(email: string | null | undefined): boolean {
  const endereco = email?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(endereco)) return false;

  if (ENDERECOS_DE_TESTE.includes(endereco)) return false;

  const dominio = endereco.split("@")[1];

  if (
    DOMINIOS_FICTICIOS.some((d) => dominio === d || dominio.endsWith(`.${d}`))
  ) {
    return false;
  }

  return !TERMINACOES_RESERVADAS.some((t) => dominio.endsWith(t));
}
