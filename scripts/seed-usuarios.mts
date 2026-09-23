// Cria as contas de demonstração e as reservas que dependem delas. Roda depois
// de supabase/seed.sql: profiles referencia professors, e bookings, profiles.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const linha of readFileSync(".env.local", "utf8").split("\n")) {
  const par = linha.match(/^([A-Z_]+)=(.*)$/);
  if (par && !process.env[par[1]]) process.env[par[1]] = par[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const senha = process.env.SEED_USER_PASSWORD;

// O e-mail que recebe as notificações na demonstração. Sem domínio verificado,
// o Resend só entrega no endereço dono da conta.
const emailDemo = process.env.SEED_DEMO_EMAIL;

if (!url || !secretKey || !senha || !emailDemo) {
  throw new Error(
    "Defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, SEED_USER_PASSWORD e SEED_DEMO_EMAIL em .env.local"
  );
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Conta = {
  email: string;
  fullName: string;
  role: "professor" | "admin";
  /** O nome identifica o docente, e não o e-mail: o da demonstração muda. */
  professorNome?: string;
};

const CONTAS: Conta[] = [
  {
    email: emailDemo,
    fullName: "Ana Beatriz Moura",
    role: "professor",
    professorNome: "Ana Beatriz Moura",
  },
  {
    email: "carlos.lima@exemplo.edu.br",
    fullName: "Carlos Eduardo Lima",
    role: "professor",
    professorNome: "Carlos Eduardo Lima",
  },
  {
    email: "marina.prado@exemplo.edu.br",
    fullName: "Marina Alves Prado",
    role: "professor",
    professorNome: "Marina Alves Prado",
  },
  {
    email: "coordenacao@exemplo.edu.br",
    fullName: "Coordenação Acadêmica",
    role: "admin",
  },
];

// Ancorados na próxima segunda, para não envelhecerem.
function slot(diasDepoisDaSegunda: number, hora: string): string {
  const hoje = new Date();
  const diaDaSemana = (hoje.getDay() + 6) % 7;
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() - diaDaSemana + 7 + diasDepoisDaSegunda);

  // Montada a partir dos componentes locais: toISOString converte para UTC, e
  // à noite isso empurra a data para o dia seguinte.
  const mes = String(segunda.getMonth() + 1).padStart(2, "0");
  const dia = String(segunda.getDate()).padStart(2, "0");

  return `${segunda.getFullYear()}-${mes}-${dia}T${hora}:00-03:00`;
}

const RESERVAS = [
  {
    building: "Bloco A",
    room: "101",
    professor: "Ana Beatriz Moura",
    className: "SI 8º semestre A",
    subject: "Engenharia de Software",
    activityType: "class",
    purpose: "Aula de Engenharia de Software",
    startsAt: slot(0, "19:00"),
    endsAt: slot(0, "20:40"),
    resources: ["Projetor"],
  },
  {
    building: "Bloco B",
    room: "Lab 01",
    professor: "Carlos Eduardo Lima",
    className: "ENG 2º semestre A",
    subject: "Resistência dos Materiais",
    activityType: "class",
    purpose: "Laboratório de Materiais",
    startsAt: slot(0, "19:00"),
    endsAt: slot(0, "20:40"),
    resources: ["Computadores"],
  },
  {
    building: "Bloco C",
    room: "Auditório",
    professor: "Marina Alves Prado",
    className: "ENF 6º semestre A",
    subject: null,
    activityType: "lecture",
    purpose: "Seminário de Saúde Coletiva",
    startsAt: slot(1, "20:00"),
    endsAt: slot(1, "21:40"),
    resources: ["Projetor", "Sistema de som"],
  },
];

async function removerContasAntigas() {
  // As reservas saem primeiro: bookings.created_by referencia profiles com
  // on delete restrict, então o banco recusa apagar a conta antes delas.
  const { error: falhaAoLimpar } = await supabase
    .from("bookings")
    .delete()
    .not("id", "is", null);

  if (falhaAoLimpar) throw falhaAoLimpar;

  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  for (const usuario of data.users) {
    const { error: falha } = await supabase.auth.admin.deleteUser(usuario.id);
    if (falha) throw falha;
  }

  console.log(`${data.users.length} conta(s) removida(s)`);
}

// Resolvidos de uma vez, antes de qualquer escrita: o e-mail do professor de
// demonstração muda no fim, e buscas tardias por ele não achariam mais nada.
async function mapearProfessores(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("professors").select("id, name");

  if (error) throw error;

  if (data.length === 0) {
    throw new Error("Nenhum professor no banco. Rode o supabase/seed.sql antes.");
  }

  return new Map(data.map((professor) => [professor.name, professor.id]));
}

function exigirProfessor(professores: Map<string, string>, nome: string): string {
  const id = professores.get(nome);

  if (!id) {
    throw new Error(`Professor ${nome} não encontrado. Rode o supabase/seed.sql antes.`);
  }

  return id;
}

async function criarContas(
  professores: Map<string, string>
): Promise<Map<string, string>> {
  const porNomeDoProfessor = new Map<string, string>();

  for (const conta of CONTAS) {
    const professorId = conta.professorNome
      ? exigirProfessor(professores, conta.professorNome)
      : null;

    // A trigger on_auth_user_created lê estes campos para montar o profile.
    const { data, error } = await supabase.auth.admin.createUser({
      email: conta.email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        full_name: conta.fullName,
        role: conta.role,
        professor_id: professorId,
      },
    });

    if (error) throw error;

    if (conta.professorNome) {
      porNomeDoProfessor.set(conta.professorNome, data.user.id);
    }

    console.log(`conta criada: ${conta.email} (${conta.role})`);
  }

  return porNomeDoProfessor;
}

// O endereço real fica só no .env.local: o SQL versionado usa domínio de
// exemplo, e sem isso a notificação do Resend não teria onde chegar.
async function apontarProfessorDeDemonstracao() {
  const { error } = await supabase
    .from("professors")
    .update({ email: emailDemo })
    .eq("name", "Ana Beatriz Moura");

  if (error) throw error;
}

async function criarReservas(
  professores: Map<string, string>,
  perfilPorProfessor: Map<string, string>
) {
  for (const reserva of RESERVAS) {
    const [sala, turma, disciplina, recursos] = await Promise.all([
      supabase
        .from("rooms")
        .select("id")
        .eq("building", reserva.building)
        .eq("name", reserva.room)
        .single(),
      supabase.from("classes").select("id").eq("name", reserva.className).single(),
      reserva.subject
        ? supabase.from("subjects").select("id").eq("name", reserva.subject).single()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("resources").select("id, name").in("name", reserva.resources),
    ]);

    const professorId = exigirProfessor(professores, reserva.professor);
    const createdBy = perfilPorProfessor.get(reserva.professor);

    if (!createdBy) throw new Error(`Sem conta para ${reserva.professor}`);

    const { error } = await supabase.rpc("create_booking", {
      p_room_id: sala.data!.id,
      p_professor_id: professorId,
      p_class_id: turma.data!.id,
      p_purpose: reserva.purpose,
      p_starts_at: reserva.startsAt,
      p_ends_at: reserva.endsAt,
      p_resource_ids: (recursos.data ?? []).map((r) => r.id),
      p_created_by: createdBy,
      p_activity_type: reserva.activityType,
      p_subject_id: disciplina.data?.id ?? null,
    });

    if (error) throw error;
    console.log(`reserva criada: ${reserva.purpose}`);
  }
}

await removerContasAntigas();
const professores = await mapearProfessores();
const perfilPorProfessor = await criarContas(professores);
await criarReservas(professores, perfilPorProfessor);
await apontarProfessorDeDemonstracao();

console.log("\nPronto. Entre com qualquer e-mail acima e a senha de SEED_USER_PASSWORD.");
