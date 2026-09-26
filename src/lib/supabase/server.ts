import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Um if solto não bastaria: declarações de função são içadas, e o TypeScript
// não propaga o estreitamento do tipo para dentro delas.
function exigirVariavel(nome: string): string {
  const valor = process.env[nome];

  if (!valor) {
    throw new Error(`${nome} não definida. Confira o arquivo .env.local.`);
  }

  return valor;
}

const url = exigirVariavel("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = exigirVariavel("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const secretKey = exigirVariavel("SUPABASE_SECRET_KEY");

// Um cliente por requisição, e não um por módulo: compartilhado, ele levaria a
// sessão de um usuário para a requisição de outro.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component não grava cookie. Quem renova a sessão é o
          // middleware, então ignorar aqui é seguro.
        }
      },
    },
  });
}

// Ignora o RLS. Só roda no servidor (server-only) e só depois de o código
// conferir quem pede: gestão de usuários, e-mails para notificação e eventos
// de autenticação, que acontecem antes de existir sessão.
export const supabaseAdmin = createClient<Database>(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
