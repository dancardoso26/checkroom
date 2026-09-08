import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cliente de acesso ao banco, para uso EXCLUSIVO no servidor.
 *
 * SOBRE O NOME DA CHAVE
 *
 * O Supabase renomeou suas chaves de API. A antiga "service_role" passou a se
 * chamar "secret key", com prefixo sb_secret_, e a antiga "anon" virou
 * "publishable key". As antigas ainda funcionam, mas o próprio painel indica
 * as novas como preferenciais, e é o formato adotado aqui.
 *
 * O import "server-only" na primeira linha não é decoração: ele faz o build
 * falhar caso este arquivo seja importado por engano em um componente de
 * cliente. Sem essa proteção, um import descuidado enviaria a chave secreta
 * para o navegador do usuário.
 *
 * POR QUE A CHAVE SECRETA, E POR QUANTO TEMPO
 *
 * Esta etapa do projeto ainda não tem autenticação, que está prevista para a
 * entrega de 28/09. As políticas de Row Level Security do PostgreSQL dependem
 * de auth.uid() para saber quem é o usuário da requisição, e sem login não
 * existe esse valor.
 *
 * Por isso o acesso usa a chave secreta, que ignora o RLS. Isso é seguro aqui
 * porque toda leitura e escrita acontece dentro de Server Actions, ou seja, no
 * servidor, e a chave nunca chega ao navegador.
 *
 * Quando a autenticação entrar, este arquivo passa a criar o cliente a partir
 * da sessão do usuário, e as políticas de RLS assumem o controle. A camada de
 * repositórios existe justamente para que essa troca fique contida aqui e não
 * espalhada pelo sistema.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

// Falhar aqui, na subida da aplicação, é melhor do que descobrir a variável
// ausente no meio de uma operação do usuário, com um erro incompreensível.
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
 * O parâmetro de tipo <Database> é o que liga o cliente ao esquema real.
 *
 * Ele vem de database.types.ts, arquivo gerado a partir do banco pelo comando
 * registrado em supabase/README.md. Com ele, o TypeScript conhece as colunas de
 * cada tabela: errar o nome de um campo, comparar um uuid com um número ou
 * esquecer uma coluna obrigatória em um insert vira erro de compilação.
 *
 * Sem o parâmetro, todas as consultas devolveriam "any" e o compilador
 * aceitaria qualquer coisa em silêncio.
 */
export const supabaseServer = createClient<Database>(url, secretKey, {
  auth: {
    // Não há usuário para persistir nem sessão para renovar: cada requisição no
    // servidor é independente. Desligar isso evita que a biblioteca tente
    // gravar sessão em um armazenamento que não existe fora do navegador.
    persistSession: false,
    autoRefreshToken: false,
  },
});
