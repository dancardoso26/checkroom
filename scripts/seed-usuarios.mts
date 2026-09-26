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
  /** Contas de desenvolvimento já nascem com os termos aceitos. */
  termosAceitos?: boolean;
};

const COORDENACAO = "coordenacao@exemplo.edu.br";

// Master provisório: passa para a conta definitiva antes da banca (TASKS.md).
const MASTER = "dev.admin@exemplo.edu.br";

// Dois grupos que não se misturam (o do segundo fator é criado pela suíte, em
// tests/e2e/global-setup.ts). As de demonstração exigem segundo fator e
// nunca são usadas pelos testes, que já apagaram o fator cadastrado nelas.
const CONTAS: Conta[] = [
  // Demonstração: as do vídeo.
  {
    email: emailDemo,
    fullName: "Ana Beatriz Moura",
    role: "professor",
    professorNome: "Ana Beatriz Moura",
  },
  {
    email: "marina.prado@exemplo.edu.br",
    fullName: "Marina Alves Prado",
    role: "professor",
    professorNome: "Marina Alves Prado",
  },
  { email: COORDENACAO, fullName: "Coordenação Acadêmica", role: "admin" },

  // Desenvolvimento: dispensadas do segundo fator pela variável
  // MFA_DISPENSADO_PARA, e só fora de produção. Usadas pelo Daniel e pelos testes.
  {
    email: "dev.admin@exemplo.edu.br",
    fullName: "Conta de desenvolvimento",
    role: "admin",
    termosAceitos: true,
  },
  {
    email: "dev.professor@exemplo.edu.br",
    fullName: "Professor de desenvolvimento",
    role: "professor",
    professorNome: "Carlos Eduardo Lima",
    termosAceitos: true,
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
    registradaPor: emailDemo,
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
    // Registrada pela secretaria em nome do docente, que é o caso que a
    // administração existe para cobrir.
    registradaPor: "dev.admin@exemplo.edu.br",
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
    registradaPor: "marina.prado@exemplo.edu.br",
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

  const { data, error } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
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
    throw new Error(
      "Nenhum professor no banco. Rode o supabase/seed.sql antes."
    );
  }

  return new Map(data.map((professor) => [professor.name, professor.id]));
}

function exigirProfessor(
  professores: Map<string, string>,
  nome: string
): string {
  const id = professores.get(nome);

  if (!id) {
    throw new Error(
      `Professor ${nome} não encontrado. Rode o supabase/seed.sql antes.`
    );
  }

  return id;
}

async function criarContas(
  professores: Map<string, string>
): Promise<Map<string, string>> {
  const porEmail = new Map<string, string>();

  for (const conta of CONTAS) {
    const professorId = conta.professorNome
      ? exigirProfessor(professores, conta.professorNome)
      : null;

    const { data, error } = await supabase.auth.admin.createUser({
      email: conta.email,
      password: senha,
      email_confirm: true,
      user_metadata: { full_name: conta.fullName },
    });

    if (error) throw error;

    // A conta nasce como aluno: a trigger não confia em metadados. Papel e
    // vínculo são gravados aqui, pelo service role.
    const { error: falhaDoPapel } = await supabase
      .from("profiles")
      .update({ role: conta.role, professor_id: professorId })
      .eq("id", data.user.id);

    if (falhaDoPapel) throw falhaDoPapel;

    porEmail.set(conta.email, data.user.id);

    if (conta.termosAceitos) {
      const { error: falha } = await supabase
        .from("profiles")
        .update({
          terms_accepted_at: new Date().toISOString(),
          terms_version: "1.0",
        })
        .eq("id", data.user.id);

      if (falha) throw falha;
    }

    console.log(`conta criada: ${conta.email} (${conta.role})`);
  }

  return porEmail;
}

// O endereço real fica só no .env.local: o SQL versionado usa domínio de
// exemplo, que o envio de e-mail recusa. Carlos e Marina recebem aliases do
// mesmo endereço (+carlos, +marina), que caem na mesma caixa de entrada.
function comAlias(email: string, alias: string): string {
  const [usuario, dominio] = email.split("@");
  return `${usuario}+${alias}@${dominio}`;
}

async function apontarProfessoresDeDemonstracao() {
  const enderecos: [string, string][] = [
    ["Ana Beatriz Moura", emailDemo!],
    ["Carlos Eduardo Lima", comAlias(emailDemo!, "carlos")],
    ["Marina Alves Prado", comAlias(emailDemo!, "marina")],
  ];

  for (const [nome, email] of enderecos) {
    const { error } = await supabase
      .from("professors")
      .update({ email })
      .eq("name", nome);
    if (error) throw error;
  }
}

// O dono do sistema, que não pode ser removido. Pelo service role: a trigger
// recusa essa mudança vinda de qualquer sessão de usuário.
async function marcarMaster(perfilPorEmail: Map<string, string>) {
  const id = perfilPorEmail.get(MASTER);
  if (!id) throw new Error(`Sem conta para ${MASTER}`);

  const { error } = await supabase
    .from("profiles")
    .update({ user_master: true })
    .eq("id", id);
  if (error) throw error;
}

async function criarReservas(
  professores: Map<string, string>,
  perfilPorEmail: Map<string, string>
) {
  for (const reserva of RESERVAS) {
    const [sala, turma, disciplina, recursos] = await Promise.all([
      supabase
        .from("rooms")
        .select("id")
        .eq("building", reserva.building)
        .eq("name", reserva.room)
        .single(),
      supabase
        .from("classes")
        .select("id")
        .eq("name", reserva.className)
        .single(),
      reserva.subject
        ? supabase
            .from("subjects")
            .select("id")
            .eq("name", reserva.subject)
            .single()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("resources")
        .select("id, name")
        .in("name", reserva.resources),
    ]);

    const professorId = exigirProfessor(professores, reserva.professor);
    const createdBy = perfilPorEmail.get(reserva.registradaPor);

    if (!createdBy) throw new Error(`Sem conta para ${reserva.registradaPor}`);

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
const perfilPorEmail = await criarContas(professores);
await criarReservas(professores, perfilPorEmail);
await marcarMaster(perfilPorEmail);
await apontarProfessoresDeDemonstracao();

console.log(
  "\nPronto. Entre com qualquer e-mail acima e a senha de SEED_USER_PASSWORD."
);
