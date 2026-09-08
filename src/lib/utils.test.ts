import { describe, it, expect } from "vitest";
import { cn } from "./utils";

/**
 * Testes da função de composição de classes.
 *
 * Além de verificar o comportamento em si, este arquivo serve como prova de
 * que a configuração do Vitest está funcionando: se o apelido "@/" ou o
 * ambiente de teste estivessem mal configurados, ele nem chegaria a rodar.
 */
describe("cn", () => {
  it("junta classes simples", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("mantém a última classe quando há conflito do Tailwind", () => {
    // Este é o comportamento que justifica usar twMerge em vez de simplesmente
    // concatenar strings: sem ele, as duas classes ficariam no elemento e o
    // resultado dependeria da ordem de geração do CSS, não da ordem escrita.
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("ignora valores falsos vindos de condicionais", () => {
    const ativo = false;
    expect(cn("base", ativo && "ativo")).toBe("base");
  });
});
