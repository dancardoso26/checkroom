import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { VERSAO_DOS_TERMOS } from "../src/domain/documentos/documentos.ts";
import {
  CHAMADOS,
  EMAIL_DO_ADMIN,
  montarContas,
  montarPalestras,
  montarReservas,
  verificar,
  type Conta,
} from "./dados-de-demonstracao.mts";

for (const linha of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const par = linha.match(/^([A-Z_]+)=(.*)$/);
  if (par && !process.env[par[1]]) process.env[par[1]] = par[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const senha = process.env.SEED_USER_PASSWORD;

const emailDemo = process.env.SEED_DEMO_EMAIL;

if (!url || !secretKey || !senha || !emailDemo) {
  throw new Error(
    "Defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, SEED_USER_PASSWORD e SEED_DEMO_EMAIL em .env.local"
  );
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CONTAS: Conta[] = montarContas(emailDemo);
const RESERVAS = montarReservas(CONTAS);
const PALESTRAS = montarPalestras(new Date());

verificar(RESERVAS, PALESTRAS);

for (const chamado of CHAMADOS) {
  for (const email of [chamado.solicitante, chamado.atribuidoA]) {
    if (email && !CONTAS.some((c) => c.email === email)) {
      throw new Error(`Chamado aponta para conta inexistente: ${email}`);
    }
  }
}

function emLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    lotes.push(itens.slice(i, i + tamanho));
  }
  return lotes;
}

async function removerContasAntigas() {
  for (const tabela of [
    "lecture_enrollments",
    "lectures",
    "tickets",
    "bookings",
  ] as const) {
    const { error } = await supabase
      .from(tabela)
      .delete()
      .not("id", "is", null);

    if (error) throw error;
  }

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

async function mapear(
  tabela: "professors" | "courses" | "classes" | "subjects" | "resources",
  coluna = "name"
): Promise<Map<string, string>> {
  const { data, error } = await supabase.from(tabela).select(`id, ${coluna}`);
  if (error) throw error;

  if (!data || data.length === 0) {
    throw new Error(`Tabela ${tabela} vazia. Rode o supabase/seed.sql antes.`);
  }

  const linhas = data as unknown as Record<string, string>[];
  return new Map(linhas.map((linha) => [linha[coluna], linha.id]));
}

async function mapearEspacos(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("rooms").select("id, name");
  if (error) throw error;
  if (data.length === 0) {
    throw new Error("Nenhum espaço no banco. Rode o supabase/seed.sql antes.");
  }
  return new Map(data.map((sala) => [sala.name, sala.id]));
}

function exigir(mapa: Map<string, string>, chave: string, tipo: string): string {
  const id = mapa.get(chave);
  if (!id) {
    throw new Error(
      `${tipo} ${chave} não encontrado. Rode o supabase/seed.sql antes.`
    );
  }
  return id;
}

async function criarContas(
  professores: Map<string, string>,
  cursos: Map<string, string>,
  turmas: Map<string, string>
): Promise<Map<string, string>> {
  const porEmail = new Map<string, string>();

  for (const conta of CONTAS) {
    const professorId = conta.professor
      ? exigir(professores, conta.professor, "Professor")
      : null;
    const cursoId = conta.curso ? exigir(cursos, conta.curso, "Curso") : null;
    const turmaId = conta.turma ? exigir(turmas, conta.turma, "Turma") : null;

    const { data, error } = await supabase.auth.admin.createUser({
      email: conta.email,
      password: senha,
      email_confirm: true,
      user_metadata: { full_name: conta.nome },
    });

    if (error) throw error;

    const { error: falhaDoPapel } = await supabase
      .from("profiles")
      .update({
        role: conta.papel,
        professor_id: professorId,
        course_id: cursoId,
        class_id: turmaId,
        ...(conta.termosAceitos
          ? {
              terms_accepted_at: new Date().toISOString(),
              terms_version: VERSAO_DOS_TERMOS,
            }
          : {}),
      })
      .eq("id", data.user.id);

    if (falhaDoPapel) throw falhaDoPapel;

    porEmail.set(conta.email, data.user.id);
  }

  console.log(`${CONTAS.length} contas criadas`);
  return porEmail;
}

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

async function marcarMaster(perfilPorEmail: Map<string, string>) {
  const id = perfilPorEmail.get(EMAIL_DO_ADMIN);
  if (!id) throw new Error(`Sem conta para ${EMAIL_DO_ADMIN}`);

  const { error } = await supabase
    .from("profiles")
    .update({ user_master: true })
    .eq("id", id);
  if (error) throw error;
}

async function criarReservas(
  professores: Map<string, string>,
  turmas: Map<string, string>,
  disciplinas: Map<string, string>,
  recursos: Map<string, string>,
  espacos: Map<string, string>,
  perfilPorEmail: Map<string, string>
) {
  const linhas = RESERVAS.map((reserva) => ({
    room_id: exigir(espacos, reserva.espaco, "Espaço"),
    professor_id: exigir(professores, reserva.professor, "Professor"),
    class_id: exigir(turmas, reserva.turma, "Turma"),
    subject_id: reserva.disciplina
      ? exigir(disciplinas, reserva.disciplina, "Disciplina")
      : null,
    activity_type: reserva.tipo,
    purpose: reserva.titulo,
    starts_at: reserva.inicio,
    ends_at: reserva.fim,
    created_by: exigir(perfilPorEmail, reserva.registradaPor, "Conta"),
    status: reserva.cancelada ? "cancelled" : "active",
    cancelled_at: reserva.cancelada?.em ?? null,
    cancellation_reason: reserva.cancelada?.motivo ?? null,
  }));

  let criadas = 0;

  for (const lote of emLotes(linhas.map((linha, i) => ({ linha, i })), 100)) {
    const { data, error } = await supabase
      .from("bookings")
      .insert(lote.map(({ linha }) => linha))
      .select("id");

    if (error) throw error;

    const ligacoes = lote.flatMap(({ i }, posicao) =>
      RESERVAS[i].recursos.map((nome) => ({
        booking_id: data[posicao].id,
        resource_id: exigir(recursos, nome, "Recurso"),
      }))
    );

    if (ligacoes.length > 0) {
      const { error: falha } = await supabase
        .from("booking_resources")
        .insert(ligacoes);
      if (falha) throw falha;
    }

    criadas += lote.length;
  }

  console.log(`${criadas} reservas criadas`);
}

async function criarChamados(
  espacos: Map<string, string>,
  perfilPorEmail: Map<string, string>
) {
  const agora = Date.now();
  const horasAtras = (h: number) =>
    new Date(agora - h * 60 * 60 * 1000).toISOString();

  const linhas = CHAMADOS.map((c) => ({
    room_id: exigir(espacos, c.espaco, "Espaço"),
    requested_by: exigir(perfilPorEmail, c.solicitante, "Conta"),
    description: c.descricao,
    priority: c.prioridade,
    status: c.status,
    assigned_to: c.atribuidoA
      ? exigir(perfilPorEmail, c.atribuidoA, "Conta")
      : null,
    created_at: horasAtras(c.criadoHa),
    started_at: c.iniciadoHa ? horasAtras(c.iniciadoHa) : null,
    resolved_at: c.resolvidoHa ? horasAtras(c.resolvidoHa) : null,
    cancelled_at: c.canceladoHa ? horasAtras(c.canceladoHa) : null,
    resolution_note: c.nota ?? null,
  }));

  const { error } = await supabase.from("tickets").insert(linhas);
  if (error) throw error;

  console.log(`${linhas.length} chamados criados`);
}

async function criarPalestras(
  espacos: Map<string, string>,
  cursos: Map<string, string>,
  perfilPorEmail: Map<string, string>
) {
  const admin = exigir(perfilPorEmail, EMAIL_DO_ADMIN, "Conta");
  const alunos = CONTAS.filter((c) => c.papel === "student");
  let inscricoes = 0;

  for (const [indice, palestra] of PALESTRAS.entries()) {
    const { data, error } = await supabase
      .from("lectures")
      .insert({
        title: palestra.titulo,
        speaker: palestra.palestrante,
        room_id: exigir(espacos, palestra.espaco, "Espaço"),
        starts_at: palestra.inicio,
        ends_at: palestra.fim,
        seats: palestra.vagas,
        created_by: admin,
      })
      .select("id")
      .single();
    if (error) throw error;

    const { error: falhaDestino } = await supabase
      .from("lecture_courses")
      .insert(
        palestra.cursos.map((curso) => ({
          lecture_id: data.id,
          course_id: exigir(cursos, curso, "Curso"),
        }))
      );
    if (falhaDestino) throw falhaDestino;

    const inscritos = alunos
      .map((aluno, posicao) => ({ aluno, posicao }))
      .filter(
        ({ aluno, posicao }) =>
          palestra.cursos.includes(aluno.curso ?? "") &&
          (posicao + indice) % 4 !== 0
      );

    if (inscritos.length > 0) {
      const { error: falhaInscricao } = await supabase
        .from("lecture_enrollments")
        .insert(
          inscritos.map(({ aluno }) => ({
            lecture_id: data.id,
            profile_id: exigir(perfilPorEmail, aluno.email, "Conta"),
          }))
        );
      if (falhaInscricao) throw falhaInscricao;
      inscricoes += inscritos.length;
    }
  }

  console.log(`${PALESTRAS.length} palestras e ${inscricoes} inscrições criadas`);
}

const professores = await mapear("professors");
const cursos = await mapear("courses");
const turmas = await mapear("classes");
const disciplinas = await mapear("subjects");
const recursos = await mapear("resources");
const espacos = await mapearEspacos();

for (const [mapa, chave, tipo] of [
  [turmas, "SI 2º semestre A", "Turma"],
  [espacos, "4T-01", "Espaço"],
  [professores, "Ricardo Tavares", "Professor"],
] as const) {
  exigir(mapa, chave, tipo);
}

await removerContasAntigas();

const perfilPorEmail = await criarContas(professores, cursos, turmas);
await criarReservas(
  professores,
  turmas,
  disciplinas,
  recursos,
  espacos,
  perfilPorEmail
);
await criarChamados(espacos, perfilPorEmail);
await criarPalestras(espacos, cursos, perfilPorEmail);
await marcarMaster(perfilPorEmail);
await apontarProfessoresDeDemonstracao();

console.log(
  "\nPronto. Entre com qualquer conta e a senha de SEED_USER_PASSWORD."
);

