const ROTAS_DO_FLUXO = [
  "/login",
  "/verificacao",
  "/recuperar-senha",
  "/nova-senha",
  "/aceitar-termos",
];

export const DESTINO_PADRAO = "/reservas";

export function destinoAposLogin(proximo: string | null | undefined): string {
  if (!proximo || !proximo.startsWith("/")) return DESTINO_PADRAO;
  if (proximo.startsWith("//") || proximo.startsWith("/\\"))
    return DESTINO_PADRAO;

  const caminho = proximo.split(/[?#]/)[0];
  const ehDoFluxo = ROTAS_DO_FLUXO.some(
    (rota) => caminho === rota || caminho.startsWith(`${rota}/`)
  );

  return ehDoFluxo ? DESTINO_PADRAO : proximo;
}
