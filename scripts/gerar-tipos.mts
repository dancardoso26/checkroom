// Gera database.types.ts a partir do esquema real do banco. Existe porque o
// redirecionamento do PowerShell grava em UTF-16, que suja o diff do git.

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const DESTINO = "src/lib/supabase/database.types.ts";

for (const linha of readFileSync(".env.local", "utf8").split("\n")) {
  const par = linha.match(/^([A-Z_]+)=(.*)$/);
  if (par && !process.env[par[1]]) process.env[par[1]] = par[2].trim();
}

// O identificador vai junto da URL do projeto, então sai dela em vez de ser
// repetido numa variável própria que poderia divergir.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const projectId = url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.at(1);

if (!projectId) {
  throw new Error(
    "Não consegui extrair o identificador do projeto de NEXT_PUBLIC_SUPABASE_URL."
  );
}

// Interpolar no comando é seguro aqui porque o regex acima já garantiu que o
// identificador só tem letras e dígitos, sem metacaractere de shell.
const saida = execSync(
  `npx -y supabase gen types typescript --project-id ${projectId}`,
  { encoding: "utf8" }
);

writeFileSync(DESTINO, saida.replace(/\r\n/g, "\n"), "utf8");

console.log(`${DESTINO} gerado a partir do projeto ${projectId}`);
