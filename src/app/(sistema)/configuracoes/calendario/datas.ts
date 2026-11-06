export function dia(data: string): string {
  const [ano, mes, d] = data.split("-");
  return `${d}/${mes}/${ano}`;
}

export function intervalo(inicio: string, fim: string): string {
  return inicio === fim ? dia(inicio) : `${dia(inicio)} a ${dia(fim)}`;
}
