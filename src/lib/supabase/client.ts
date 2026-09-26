import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// O segundo fator é verificado aqui, e não no servidor: a biblioteca renova a
// sessão em segundo plano, e uma Server Action termina antes disso gravar.
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
