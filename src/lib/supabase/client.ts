import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { OPCOES_DO_COOKIE_DE_SESSAO } from "./opcoes-de-cookie";

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookieOptions: OPCOES_DO_COOKIE_DE_SESSAO }
  );
}
