import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom simula um navegador em memoria. E o que permite testar componentes
    // de interface sem abrir um navegador de verdade.
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],

    exclude: ["node_modules/**", "tests/e2e/**"],
    coverage: {
      provider: "v8",

      include: ["src/domain/**", "src/lib/**"],

      all: true,

      exclude: ["src/lib/supabase/database.types.ts"],
      reporter: ["text", "html"],

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
