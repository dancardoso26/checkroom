import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cliente de acesso ao banco, para uso exclusivo no servidor.
 *
 * O import "server-only" faz o build falhar se este arquivo for importado em um
 * componente de cliente, o que enviaria a chave secreta ao navegador.
 *
 * A chave secreta ignora o RLS. É seguro aqui porque toda leitura e escrita
 * acontece dentro de Server Actions, mas é uma solução datada: as políticas de
 * RLS dependem de auth.uid(), que não existe sem login. Na entrega de 28/09 o
 * cliente passa a ser criado a partir da sessão do usuário, e a camada de
 * repositórios existe para conter essa troca em poucos arquivos.
 *
 * As chaves seguem a nomenclatura nova do Supabase: sb_secret_ substituiu a
 * antiga service_role, e sb_publishable_ substituiu a anon.
 */

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

/**
 * O parâmetro <Database> vem de database.types.ts, gerado a partir do esquema
 * real. Sem ele, todas as consultas devolveriam "any" e o compilador aceitaria
 * qualquer coisa em silêncio.
 */
export const supabaseServer = createClient<Database>(url, secretKey, {
  auth: {
    // Cada requisição no servidor é independente: não há sessão para persistir
    // nem token para renovar.
    persistSession: false,
    autoRefreshToken: false,
  },
});
