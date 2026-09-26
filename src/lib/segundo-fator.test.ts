import { describe, expect, it } from "vitest";

import { dispensaSegundoFator } from "./segundo-fator";

const LISTA = "dev.admin@exemplo.edu.br, dev.professor@exemplo.edu.br";

describe("dispensaSegundoFator", () => {
  it("dispensa quem está na lista, em desenvolvimento", () => {
    expect(
      dispensaSegundoFator("dev.admin@exemplo.edu.br", {
        NODE_ENV: "development",
        MFA_DISPENSADO_PARA: LISTA,
      })
    ).toBe(true);
  });

  // A garantia central: nenhuma configuração esquecida no servidor abre a porta.
  it("nunca dispensa em produção, mesmo com a lista preenchida", () => {
    expect(
      dispensaSegundoFator("dev.admin@exemplo.edu.br", {
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
      dispensaSegundoFator("DEV.Professor@exemplo.edu.br", {
        NODE_ENV: "development",
        MFA_DISPENSADO_PARA: LISTA,
      })
    ).toBe(true);
  });

  it("exige de todos quando a lista não existe", () => {
    expect(
      dispensaSegundoFator("dev.admin@exemplo.edu.br", { NODE_ENV: "development" })
    ).toBe(false);
    expect(
      dispensaSegundoFator(undefined, {
        NODE_ENV: "development",
        MFA_DISPENSADO_PARA: LISTA,
      })
    ).toBe(false);
  });
});
