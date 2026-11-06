import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

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
        } catch {}
      },
    },
  });
}

export const supabaseAdmin = createClient<Database>(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
