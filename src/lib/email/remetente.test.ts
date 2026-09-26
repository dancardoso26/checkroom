import { describe, expect, it } from "vitest";

import { lerRemetente, REMETENTE_PADRAO } from "./remetente";

describe("remetente das notificações", () => {
  it("usa o padrão quando a variável não existe", () => {
    expect(lerRemetente(undefined)).toBe(REMETENTE_PADRAO);
  });

  it("usa o padrão quando a variável está vazia ou em branco", () => {
    expect(lerRemetente("")).toBe(REMETENTE_PADRAO);
    expect(lerRemetente("   ")).toBe(REMETENTE_PADRAO);
  });

  it("respeita o valor configurado", () => {
    expect(lerRemetente(" CheckRoom <avisos@umc.br> ")).toBe("CheckRoom <avisos@umc.br>");
  });
});
