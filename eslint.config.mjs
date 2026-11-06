import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  {
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
