import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  {
    // Diretórios gerados. Sem isto, o ESLint tentaria analisar o build inteiro
    // e a saída ficaria dominada por avisos de código que ninguém escreveu.
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "blob-report/**",
      "next-env.d.ts",
      "src/lib/supabase/database.types.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
];

export default config;
