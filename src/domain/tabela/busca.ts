export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function correspondeABusca(
  campos: (string | null)[],
  busca: string
): boolean {
  const termos = normalizar(busca).split(/\s+/).filter(Boolean);
  if (termos.length === 0) return true;

  const texto = normalizar(campos.filter(Boolean).join(" "));
  return termos.every((termo) => texto.includes(termo));
}
