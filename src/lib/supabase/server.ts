import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

// Falhar na subida da aplicação é melhor do que descobrir a variável ausente no
// meio de uma operação do usuário.
if (!url) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL não definida. Confira o arquivo .env.local."
  );
}

if (!secretKey) {
  throw new Error(
    "SUPABASE_SECRET_KEY não definida. Confira o arquivo .env.local."
  );
}

export const supabaseServer = createClient<Database>(url, secretKey, {
  auth: {
    // Cada requisição no servidor é independente: não há sessão para persistir
    // nem token para renovar.
    persistSession: false,
    autoRefreshToken: false,
  },
});
