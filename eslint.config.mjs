import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/**
 * CONFIGURAÇÃO DO ESLINT
 *
 * Este arquivo faltava, e a ausência era silenciosa do jeito ruim: o script
 * "npm run lint" existia no package.json desde o início e falhava com
 * "couldn't find an eslint.config file". Quem rodasse veria um erro; quem não
 * rodasse concluiria que o projeto estava sendo verificado. Nenhum problema
 * estático foi apontado até aqui porque nada estava olhando.
 *
 * POR QUE O FORMATO É ESTE
 *
 * O ESLint 9 abandonou o .eslintrc e passou a usar a "flat config": um arquivo
 * que exporta um array de configurações, sem herança implícita.
 *
 * A primeira tentativa aqui usou FlatCompat, a ponte oficial para configurações
 * no formato antigo, e quebrou com "Converting circular structure to JSON". O
 * motivo é que o eslint-config-next 16 JÁ é flat: passá-lo pela ponte fazia o
 * ESLint tentar converter duas vezes. Importar direto resolve, e é mais simples.
 *
 * O QUE CADA CONJUNTO TRAZ
 *
 *   core-web-vitals  regras do Next mais as que afetam desempenho e
 *                    acessibilidade percebida, como usar next/image em vez de
 *                    <img> e next/link em vez de <a>
 *   typescript       regras específicas de TypeScript
 *
 * O ESLint não substitui o tsc. O compilador verifica tipos; o ESLint aponta
 * padrões que compilam mas costumam esconder defeito, como uma dependência
 * ausente em useEffect ou uma variável declarada e nunca usada.
 */

const config = [
  {
    // Diretórios gerados. Sem isto, o ESLint tentaria analisar o build inteiro
    // e a saída ficaria dominada por avisos de código que ninguém escreveu.
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      // Artefatos do Playwright. O relatório HTML embute bundles minificados, e
      // sem esta linha o lint analisa milhares de linhas de código que ninguém
      // escreveu, afogando os avisos que importam.
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

// Nomear antes de exportar é exigência de uma das próprias regras do Next
// (import/no-anonymous-default-export). Um default anônimo aparece sem nome em
// mensagens de erro e no depurador.
export default config;
