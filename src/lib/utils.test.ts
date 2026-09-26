import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("junta classes simples", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("mantém a última classe quando há conflito do Tailwind", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("ignora valores falsos vindos de condicionais", () => {
    const ativo = false;
    expect(cn("base", ativo && "ativo")).toBe("base");
  });
});
