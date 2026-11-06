export type ProfessorDaLista = { id: string; name: string };

function normalizar(nome: string): string {
  return nome.trim().replace(/\s+/g, " ").toLowerCase();
}

export function mesmoNome(a: string, b: string): boolean {
  return normalizar(a) === normalizar(b);
}

export function professorDoPalestrante(
  nome: string,
  professores: ProfessorDaLista[],
): ProfessorDaLista | null {
  if (normalizar(nome) === "") return null;

  const iguais = professores.filter((p) => mesmoNome(p.name, nome));
  return iguais.length === 1 ? iguais[0] : null;
}
