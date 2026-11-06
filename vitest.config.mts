import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],

    exclude: ["node_modules/**", "tests/e2e/**"],
    coverage: {
      provider: "v8",

      include: ["src/domain/**", "src/lib/**"],

      exclude: [
        "src/lib/supabase/**",
        "src/lib/repositories/**",
        "src/lib/email/**",
        "src/lib/auditoria.ts",
        "src/lib/sessao.ts",
      ],
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
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
