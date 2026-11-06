import { readFileSync } from "node:fs";
import path from "node:path";

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
  return corpo as {
    id: string;
    name: string;
    building: string;
    capacity: number;
  }[];
}

export async function listarProfessores() {
  const { corpo } = await pedir("professors?select=id,name,email");
  return corpo as { id: string; name: string; email: string }[];
}

export async function listarTurmas() {
  const { corpo } = await pedir("classes?select=id,name");
  return corpo as { id: string; name: string }[];
}

let perfilDeTeste: string | null = null;

async function algumPerfil(): Promise<string> {
  if (perfilDeTeste) return perfilDeTeste;

  const { corpo } = await pedir("profiles?select=id&limit=1");

  if (corpo.length === 0) {
    throw new Error(
      'Nenhum perfil no banco. Rode "npm run seed:usuarios" antes.'
    );
  }

  perfilDeTeste = corpo[0].id as string;
  return perfilDeTeste;
}

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
    body: JSON.stringify({ ...linha, created_by: await algumPerfil() }),
  });

  return {
    aceitou: ok,
    id: ok ? (corpo[0].id as string) : null,
    codigo: ok ? null : (corpo.code as string),
    mensagem: ok ? null : (corpo.message as string),
  };
}

export async function inserirPalestraDireta(linha: {
  room_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
}) {
  const { ok, corpo } = await pedir("lectures", {
    method: "POST",
    body: JSON.stringify({
      ...linha,
      speaker: "Convidado de teste",
      seats: 1,
      created_by: await algumPerfil(),
    }),
  });

  return {
    aceitou: ok,
    mensagem: ok ? null : (corpo.message as string),
  };
}

export async function apagarReserva(id: string) {
  await pedir(`bookings?id=eq.${id}`, { method: "DELETE" });
}

export async function buscarReserva(id: string): Promise<LinhaReserva | null> {
  const { corpo } = await pedir(
    `bookings?id=eq.${id}&select=id,room_id,professor_id,class_id,purpose,starts_at,ends_at,status,cancelled_at,cancellation_reason`
  );
  return corpo.length > 0 ? corpo[0] : null;
}

export async function contarRecursosDaReserva(id: string): Promise<number> {
  const { corpo } = await pedir(
    `booking_resources?booking_id=eq.${id}&select=resource_id`
  );
  return corpo.length;
}

export async function vincularRecursos(
  bookingId: string,
  resourceIds: string[]
) {
  await pedir("booking_resources", {
    method: "POST",
    body: JSON.stringify(
      resourceIds.map((resource_id) => ({ booking_id: bookingId, resource_id }))
    ),
  });
}

export async function listarRecursos() {
  const { corpo } = await pedir("resources?select=id,name");
  return corpo as { id: string; name: string }[];
}

export const PREFIXO_TESTE = "[e2e]";
export const PREDIO_DE_TESTE = 99;

export async function limparReservasDeTeste() {
  await pedir(`bookings?purpose=like.${encodeURIComponent(PREFIXO_TESTE)}*`, {
    method: "DELETE",
  });
  await pedir(`lectures?title=like.${encodeURIComponent(PREFIXO_TESTE)}*`, {
    method: "DELETE",
  });
}

const COMECA_COM_PREFIXO = `like.${encodeURIComponent(PREFIXO_TESTE)}*`;

export async function limparCadastrosDeTeste() {
  await pedir(`calendar_blocks?reason=${COMECA_COM_PREFIXO}`, { method: "DELETE" });
  await pedir(`academic_terms?code=eq.2099.1`, { method: "DELETE" });
  await pedir(`lectures?title=${COMECA_COM_PREFIXO}`, { method: "DELETE" });
  await pedir(`tickets?description=${COMECA_COM_PREFIXO}`, { method: "DELETE" });
  await pedir(`rooms?building_number=eq.${PREDIO_DE_TESTE}`, { method: "DELETE" });
  await pedir(`resources?name=${COMECA_COM_PREFIXO}`, { method: "DELETE" });
  await pedir(`teaching_assignments?term=eq.2099.1`, { method: "DELETE" });
  await pedir(`classes?name=${COMECA_COM_PREFIXO}`, { method: "DELETE" });
  await pedir(`subjects?name=${COMECA_COM_PREFIXO}`, { method: "DELETE" });
  await pedir(`courses?name=${COMECA_COM_PREFIXO}`, { method: "DELETE" });
}

export async function contar(caminho: string): Promise<number> {
  const resposta = await fetch(`${BASE}/${caminho}`, {
    headers: { ...headers, Prefer: "count=exact" },
    method: "HEAD",
  });
  return Number(resposta.headers.get("content-range")?.split("/")[1] ?? 0);
}

export function dataDaqui(dias: number): string {
  const alvo = new Date();
  alvo.setDate(alvo.getDate() + dias);

  const mes = String(alvo.getMonth() + 1).padStart(2, "0");
  const dia = String(alvo.getDate()).padStart(2, "0");
  return `${alvo.getFullYear()}-${mes}-${dia}`;
}
