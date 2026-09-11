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

/** A reserva existe no banco? Usado para provar que excluir apaga de verdade. */
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

/** Vincula recursos a uma reserva, para o teste do cascade ter o que verificar. */
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

export async function limparReservasDeTeste() {
  await pedir(`bookings?purpose=like.${encodeURIComponent(PREFIXO_TESTE)}*`, {
    method: "DELETE",
  });
}
