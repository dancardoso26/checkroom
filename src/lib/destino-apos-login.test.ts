import { describe, expect, it } from "vitest";

import { destinoAposLogin, DESTINO_PADRAO } from "./destino-apos-login";

describe("destino depois do login", () => {
  it("volta para onde a pessoa queria ir", () => {
    expect(destinoAposLogin("/reservas?visao=tabela")).toBe(
      "/reservas?visao=tabela"
    );
    expect(destinoAposLogin("/configuracoes/usuarios")).toBe(
      "/configuracoes/usuarios"
    );
  });

  it("cai na agenda sem destino", () => {
    expect(destinoAposLogin(undefined)).toBe(DESTINO_PADRAO);
    expect(destinoAposLogin("")).toBe(DESTINO_PADRAO);
  });

  // Foi o bug: /verificacao como destino abria o segundo fator para quem é
  // dispensado dele.
  it("ignora as telas do próprio fluxo de entrada", () => {
    expect(destinoAposLogin("/verificacao")).toBe(DESTINO_PADRAO);
    expect(destinoAposLogin("/verificacao/configurar")).toBe(DESTINO_PADRAO);
    expect(destinoAposLogin("/login?proximo=%2Freservas")).toBe(DESTINO_PADRAO);
    expect(destinoAposLogin("/nova-senha")).toBe(DESTINO_PADRAO);
  });

  it("não confunde rotas que só começam igual", () => {
    expect(destinoAposLogin("/verificacoes-futuras")).toBe(
      "/verificacoes-futuras"
    );
  });

  it("recusa endereços de outro site", () => {
    expect(destinoAposLogin("//site-falso.com")).toBe(DESTINO_PADRAO);
    expect(destinoAposLogin(String.raw`/\site-falso.com`)).toBe(DESTINO_PADRAO);
    expect(destinoAposLogin("https://site-falso.com")).toBe(DESTINO_PADRAO);
  });
});
