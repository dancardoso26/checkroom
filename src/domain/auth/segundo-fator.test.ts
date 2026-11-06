import { describe, expect, it } from "vitest";

import { dispensaSegundoFator } from "./segundo-fator";

const LISTA = "adm@umc.br, professor@umc.br";

describe("dispensaSegundoFator", () => {
  it("dispensa quem está na lista, em desenvolvimento", () => {
    expect(
      dispensaSegundoFator("adm@umc.br", {
        NODE_ENV: "development",
        MFA_DISPENSADO_PARA: LISTA,
      })
    ).toBe(true);
  });

  it("nunca dispensa em produção, mesmo com a lista preenchida", () => {
    expect(
      dispensaSegundoFator("adm@umc.br", {
        NODE_ENV: "production",
        MFA_DISPENSADO_PARA: LISTA,
      })
    ).toBe(false);
  });

  it("exige de quem não está na lista", () => {
    expect(
      dispensaSegundoFator("coordenacao@exemplo.edu.br", {
        NODE_ENV: "development",
        MFA_DISPENSADO_PARA: LISTA,
      })
    ).toBe(false);
  });

  it("ignora maiúsculas e espaços", () => {
    expect(
      dispensaSegundoFator("Professor@UMC.br", {
        NODE_ENV: "development",
        MFA_DISPENSADO_PARA: LISTA,
      })
    ).toBe(true);
  });

  it("exige de todos quando a lista não existe", () => {
    expect(
      dispensaSegundoFator("adm@umc.br", { NODE_ENV: "development" })
    ).toBe(false);
    expect(
      dispensaSegundoFator(undefined, {
        NODE_ENV: "development",
        MFA_DISPENSADO_PARA: LISTA,
      })
    ).toBe(false);
  });
});
