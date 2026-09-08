import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Configuracao dos testes.
 *
 * O Vitest roda separado do Next.js, entao ele precisa saber sozinho duas
 * coisas: como interpretar JSX (papel do plugin react) e o que significa o
 * apelido "@/" usado nos imports (papel do alias abaixo, que espelha o que
 * esta em tsconfig.json).
 */
export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom simula um navegador em memoria. E o que permite testar componentes
    // de interface sem abrir um navegador de verdade.
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],

    // Os testes de ponta a ponta usam o executor do Playwright, que tem APIs
    // proprias. Sem esta exclusao o Vitest tentaria roda-los e falharia ao
    // encontrar "test.describe" com uma assinatura que nao conhece.
    exclude: ["node_modules/**", "tests/e2e/**"],
    coverage: {
      // O provedor precisa ser declarado. Sem ele, "npm run test:coverage"
      // falhava pedindo a instalacao de @vitest/coverage-v8, e a meta descrita
      // na monografia nunca chegava a ser medida.
      provider: "v8",

      // A meta de 50% assumida na monografia e medida sobre o codigo que
      // realmente contem regra de negocio. Arquivos de configuracao e telas
      // entrariam na conta inflando o numero sem significar nada.
      include: ["src/domain/**", "src/lib/**"],

      // Sem "all", so entram na conta os arquivos que algum teste importou. Um
      // modulo inteiro sem nenhum teste ficaria invisivel e o percentual subiria
      // justamente por causa da ausencia de testes, que e o contrario do que a
      // metrica deveria indicar.
      all: true,

      exclude: ["src/lib/supabase/database.types.ts"],
      reporter: ["text", "html"],

      // Os limites sao o que transforma a meta em criterio. Abaixo deles o
      // comando falha, entao a promessa da monografia passa a ser verificavel em
      // vez de declarada.
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
  },
  resolve: {
    alias: {
      // import.meta.dirname substitui __dirname, que nao existe em modulos ESM.
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
