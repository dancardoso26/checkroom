// Telas do próprio fluxo de entrada: voltar a elas depois de entrar não faz
// sentido, e /verificacao abre para qualquer conta, mesmo as dispensadas dela.
const ROTAS_DO_FLUXO = [
  "/login",
  "/verificacao",
  "/recuperar-senha",
  "/nova-senha",
  "/aceitar-termos",
];

export const DESTINO_PADRAO = "/reservas";

// Só caminho interno e legítimo. "//site.com" e "/\site.com" começam com barra,
// mas o navegador os trata como outro endereço: seria um redirecionamento
// aberto, usado para levar a pessoa a um site falso logo depois do login.
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
