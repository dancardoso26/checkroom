import { describe, expect, it } from "vitest";

import { aceiteEmDia, VERSAO_DOS_TERMOS } from "./documentos";

describe("aceite dos termos", () => {
  it("vale para a versão vigente", () => {
    expect(aceiteEmDia(VERSAO_DOS_TERMOS)).toBe(true);
  });

  it("deixa de valer quando a versão muda, ou se nunca houve aceite", () => {
    expect(aceiteEmDia("0.9")).toBe(false);
    expect(aceiteEmDia(null)).toBe(false);
  });
});
