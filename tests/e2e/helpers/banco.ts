import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * ACESSO AO BANCO A PARTIR DOS TESTES
 *
 * Os testes de ponta a ponta rodam fora do Next, então não têm acesso aos
 * repositórios da aplicação, que importam "server-only". Falam direto com a API
 * REST do Supabase.
 *
 * Isso não é uma limitação, é o que dá valor à suíte: as constraints de
 * exclusão são verificadas pelo mesmo caminho de um INSERT feito no editor SQL,
 * ou seja, sem passar por validateBooking. Se a garantia dependesse da
 * aplicação, estes testes falhariam, que é exatamente o que deveriam fazer.
 */

/**
 * Lê o .env.local à mão em vez de usar uma biblioteca.
 *
 * O arquivo é carregado pelo Next em tempo de execução, mas os testes rodam em
 * outro processo e não herdam nada dele. Acrescentar dotenv só para ler três
 * linhas seria uma dependência a mais para um problema que cabe em cinco.
 */
function lerEnv(): Record<string, string> {
  const arquivo = path.resolve(process.cwd(), ".env.local");
  const conteudo = readFileSync(arquivo, "utf8");

  return Object.fromEntries(
    conteudo
      .split(/\r?\n/)
      .filter((linha) => /^[A-Z]/.test(linha))
      .map((linha) => {
        const separador = linha.indexOf("=");
        return [linha.slice(0, separador), linha.slice(separador + 1)];
      })
  );
}

const env = lerEnv();
const BASE = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;

/**
 * A chave secreta, a mesma que o servidor usa.
 *
 * Ela ignora o RLS, o que aqui é intencional: os testes precisam preparar e
 * conferir o estado do banco livremente. É também o motivo de esta suíte nunca
 * dever apontar para um banco de produção.
 */
const headers = {
  apikey: env.SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

export type LinhaReserva = {
  id: string;
  room_id: string;
  professor_id: string;
  class_id: string;
  purpose: string;
  starts_at: string;
  ends_at: string;
  status: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
};

async function pedir(caminho: string, init?: RequestInit) {
  const resposta = await fetch(`${BASE}/${caminho}`, { ...init, headers });
  const texto = await resposta.text();
  const corpo = texto ? JSON.parse(texto) : null;

  return { ok: resposta.ok, status: resposta.status, corpo };
}

export async function listarReservas(): Promise<LinhaReserva[]> {
  const { corpo } = await pedir(
    "bookings?select=id,room_id,professor_id,class_id,purpose,starts_at,ends_at,status,cancelled_at,cancellation_reason&order=starts_at"
  );
  return corpo;
}

export async function listarEspacos() {
  const { corpo } = await pedir("rooms?select=id,name,building,capacity");
  return corpo as { id: string; name: string; building: string; capacity: number }[];
}

export async function listarProfessores() {
  const { corpo } = await pedir("professors?select=id,name,email");
  return corpo as { id: string; name: string; email: string }[];
}

export async function listarTurmas() {
  const { corpo } = await pedir("classes?select=id,name,student_count");
  return corpo as { id: string; name: string; student_count: number }[];
}

/**
 * Insere uma reserva sem passar pela aplicação.
 *
 * Devolve o erro em vez de lançar, porque nos testes de constraint a falha é o
 * resultado esperado e precisa ser inspecionada.
 */
export async function inserirReservaDireto(linha: {
  room_id: string;
  professor_id: string;
  class_id: string;
  purpose: string;
  starts_at: string;
  ends_at: string;
}) {
  const { ok, corpo } = await pedir("bookings", {
    method: "POST",
    body: JSON.stringify(linha),
  });

  return {
    aceitou: ok,
    id: ok ? (corpo[0].id as string) : null,
    codigo: ok ? null : (corpo.code as string),
    mensagem: ok ? null : (corpo.message as string),
  };
}

export async function apagarReserva(id: string) {
  await pedir(`bookings?id=eq.${id}`, { method: "DELETE" });
}

/**
 * O prefixo que marca tudo o que os testes criam.
 *
 * Serve para a limpeza encontrar exatamente as próprias reservas e nunca tocar
 * nas três que vêm do seed, que são a base contra a qual os conflitos são
 * testados.
 */
export const PREFIXO_TESTE = "[e2e]";

export async function limparReservasDeTeste() {
  await pedir(`bookings?purpose=like.${encodeURIComponent(PREFIXO_TESTE)}*`, {
    method: "DELETE",
  });
}
