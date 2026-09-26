import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const CONTA_COM_SEGUNDO_FATOR = "teste.mfa@exemplo.edu.br";

export function clienteAdmin() {
  const env = Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .map((linha) => linha.match(/^([A-Z_]+)=(.*)$/))
      .filter((par): par is RegExpMatchArray => par !== null)
      .map((par) => [par[1], par[2].trim()])
  );

  return {
    senha: env.SEED_USER_PASSWORD,
    supabase: createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SECRET_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    ),
  };
}

// A conta de teste do segundo fator é recriada a cada suíte e apagada no fim
// (global-teardown): o segredo dela só existe na memória de uma execução, então
// uma conta permanente cairia num desafio cujo código não tem como gerar.
export default async function globalSetup() {
  const { supabase, senha } = clienteAdmin();

  const { data, error } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw error;

  const existente = data.users.find((u) => u.email === CONTA_COM_SEGUNDO_FATOR);
  if (existente) await supabase.auth.admin.deleteUser(existente.id);

  const { error: falha } = await supabase.auth.admin.createUser({
    email: CONTA_COM_SEGUNDO_FATOR,
    password: senha,
    email_confirm: true,
    user_metadata: { full_name: "Teste de segundo fator" },
  });

  if (falha) throw falha;
}
