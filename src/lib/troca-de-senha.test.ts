import { describe, expect, it } from "vitest";

import { podeTrocarSenha } from "./troca-de-senha";

const agora = 1_790_000_000;

describe("quem pode trocar a senha", () => {
  it("aceita a sessão aberta pelo link de recuperação ou de convite", () => {
    expect(
      podeTrocarSenha({
        aal: "aal1",
        amr: [{ method: "recovery", timestamp: agora }],
      })
    ).toBe(true);
    expect(
      podeTrocarSenha({
        aal: "aal1",
        amr: [{ method: "invite", timestamp: agora }],
      })
    ).toBe(true);
    expect(podeTrocarSenha({ aal: "aal1", amr: ["otp"] })).toBe(true);
  });

  it("aceita quem já passou pelo segundo fator", () => {
    expect(
      podeTrocarSenha({
        aal: "aal2",
        amr: [{ method: "password" }, { method: "totp" }],
      })
    ).toBe(true);
  });

  // O ataque: saber só a senha e trocá-la para trancar o dono.
  it("recusa a sessão aberta só com a senha", () => {
    expect(
      podeTrocarSenha({
        aal: "aal1",
        amr: [{ method: "password", timestamp: agora }],
      })
    ).toBe(false);
  });

  it("recusa sem sessão ou sem métodos", () => {
    expect(podeTrocarSenha(null)).toBe(false);
    expect(podeTrocarSenha({ aal: "aal1" })).toBe(false);
  });
});
