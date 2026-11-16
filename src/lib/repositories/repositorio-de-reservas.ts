import "server-only";
import {
  criarClienteDoServidor,
  clienteAdministrativo,
} from "@/lib/supabase/servidor";
import type {
  TipoDeAtividade,
  OcupacaoExistente,
} from "@/domain/reservas/tipos";
import { correspondeABusca } from "@/domain/tabela/busca";
import { formatarPeriodo } from "@/lib/datas";
import {
  condicaoDeStatus,
  FILTROS_PADRAO,
  type Filtros,
} from "@/domain/agenda/filtros-da-agenda";
import { palestrasComoOcupacao } from "./repositorio-de-palestras";
import type { Ordenacao, Sentido } from "@/domain/tabela/tabela";

function paraData(valor: string): Date {
  return new Date(valor);
}

type LinhaDeOcupacao = {
  id: string;
  room_id: string;
  professor_id: string;
  class_id: string;
  purpose: string;
  starts_at: string;
  ends_at: string;
};

async function comoOcupacoes(
  linhas: LinhaDeOcupacao[],
): Promise<OcupacaoExistente[]> {
  const visiveis = new Set<string>();

  if (linhas.length > 0) {
    const supabase = await criarClienteDoServidor();
    const { data, error } = await supabase
      .from("bookings")
      .select("id")
      .in(
        "id",
        linhas.map((linha) => linha.id),
      );

    if (error) {
      throw new Error(`Falha ao consultar a agenda: ${error.message}`);
    }

    for (const linha of data) visiveis.add(linha.id);
  }

  return linhas.map((linha) => ({
    id: linha.id,
    espacoId: linha.room_id,
    professorId: linha.professor_id,
    turmaId: linha.class_id,
    finalidade: visiveis.has(linha.id) ? linha.purpose : null,
    inicio: paraData(linha.starts_at),
    fim: paraData(linha.ends_at),
  }));
}

export async function buscarCandidatosAConflito(parametros: {
  espacoId: string;
  professorId: string;
  turmaId: string;
  inicio: Date;
  fim: Date;
}): Promise<OcupacaoExistente[]> {
  const consulta = clienteAdministrativo
    .from("bookings")
    .select("id, room_id, professor_id, class_id, purpose, starts_at, ends_at")
    .or(
      `room_id.eq.${parametros.espacoId},professor_id.eq.${parametros.professorId},class_id.eq.${parametros.turmaId}`,
    )
    .eq("status", "active")
    .lt("starts_at", parametros.fim.toISOString())
    .gt("ends_at", parametros.inicio.toISOString());

  const [{ data, error }, palestras] = await Promise.all([
    consulta,
    palestrasComoOcupacao({
      inicio: parametros.inicio,
      fim: parametros.fim,
      espacoId: parametros.espacoId,
    }),
  ]);

  if (error) {
    throw new Error(`Falha ao verificar conflitos: ${error.message}`);
  }

  return [...(await comoOcupacoes(data)), ...palestras];
}

export async function buscarOcupacoesNoPeriodo(parametros: {
  inicio: Date;
  fim: Date;
}): Promise<OcupacaoExistente[]> {
  const [{ data, error }, palestras] = await Promise.all([
    clienteAdministrativo
      .from("bookings")
      .select(
        "id, room_id, professor_id, class_id, purpose, starts_at, ends_at",
      )
      .eq("status", "active")
      .lt("starts_at", parametros.fim.toISOString())
      .gt("ends_at", parametros.inicio.toISOString()),
    palestrasComoOcupacao({ inicio: parametros.inicio, fim: parametros.fim }),
  ]);

  if (error) {
    throw new Error(`Falha ao consultar a agenda: ${error.message}`);
  }

  return [...(await comoOcupacoes(data)), ...palestras];
}

export type DesfechoDaCriacao =
  | { status: "criada"; reservaId: string }
  | {
      status: "conflito";
      codigo:
        "CONFLITO_DE_ESPACO" | "CONFLITO_DE_PROFESSOR" | "CONFLITO_DE_TURMA";
    }
  | { status: "erro"; mensagem: string };

const VIOLACAO_POR_RESTRICAO = {
  bookings_no_room_overlap: "CONFLITO_DE_ESPACO",
  bookings_no_professor_overlap: "CONFLITO_DE_PROFESSOR",
  bookings_no_class_overlap: "CONFLITO_DE_TURMA",
  booking_lecture_overlap: "CONFLITO_DE_ESPACO",
} as const;

export async function buscarDonoDaReserva(
  reservaId: string,
): Promise<{ criadaPor: string; professorId: string } | null> {
  const supabase = await criarClienteDoServidor();

  const { data, error } = await supabase
    .from("bookings")
    .select("created_by, professor_id")
    .eq("id", reservaId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar a reserva: ${error.message}`);
  }

  if (!data) return null;

  return { criadaPor: data.created_by, professorId: data.professor_id };
}

export type DadosParaNotificacao = {
  professorNome: string;
  professorEmail: string;
  finalidade: string;
  espaco: string;
  turma: string;
  inicio: Date;
  fim: Date;
  motivo: string | null;
  ativa: boolean;
};

export async function buscarDadosParaAvisoDaReserva(
  reservaId: string,
): Promise<DadosParaNotificacao | null> {
  const supabase = clienteAdministrativo;

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `purpose, starts_at, ends_at, cancellation_reason, status,
       rooms(name, building),
       professors(name, email),
       classes(name)`,
    )
    .eq("id", reservaId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    professorNome: data.professors.name,
    professorEmail: data.professors.email,
    finalidade: data.purpose,
    espaco: data.rooms.name,
    turma: data.classes.name,
    inicio: new Date(data.starts_at),
    fim: new Date(data.ends_at),
    motivo: data.cancellation_reason,
    ativa: data.status === "active",
  };
}

export async function gravarReserva(entrada: {
  espacoId: string;
  professorId: string;
  turmaId: string;
  tipoDeAtividade: TipoDeAtividade;
  disciplinaId: string | null;
  finalidade: string;
  inicio: Date;
  fim: Date;
  recursoIds: string[];
  criadaPor: string;
}): Promise<DesfechoDaCriacao> {
  const supabase = await criarClienteDoServidor();

  const { data, error } = await supabase.rpc("create_booking", {
    p_room_id: entrada.espacoId,
    p_professor_id: entrada.professorId,
    p_class_id: entrada.turmaId,
    p_activity_type: entrada.tipoDeAtividade,
    p_subject_id: entrada.disciplinaId ?? undefined,
    p_purpose: entrada.finalidade.trim(),
    p_starts_at: entrada.inicio.toISOString(),
    p_ends_at: entrada.fim.toISOString(),
    p_resource_ids: entrada.recursoIds,
    p_created_by: entrada.criadaPor,
  });

  if (!error) {
    return { status: "criada", reservaId: data };
  }

  if (error.code === "23P01") {
    const texto = `${error.message} ${error.details ?? ""}`;

    for (const [restricao, codigo] of Object.entries(VIOLACAO_POR_RESTRICAO)) {
      if (texto.includes(restricao)) {
        return { status: "conflito", codigo };
      }
    }

    return {
      status: "erro",
      mensagem: "A reserva conflita com outra já existente.",
    };
  }

  if (error.code === "23514") {
    return {
      status: "erro",
      mensagem: "O período informado é inválido.",
    };
  }

  if (error.code === "23503") {
    return {
      status: "erro",
      mensagem:
        "Espaço, professor ou turma não existe mais. Recarregue a página e tente de novo.",
    };
  }

  console.error("Falha inesperada ao gravar reserva:", error);

  return {
    status: "erro",
    mensagem:
      "Não foi possível gravar a reserva. Tente novamente em alguns instantes.",
  };
}

export type ReservaDaLista = {
  id: string;
  finalidade: string;
  tipoDeAtividade: TipoDeAtividade;
  inicio: Date;
  fim: Date;
  espacoId: string;
  nomeDoEspaco: string;
  predio: string;
  nomeDoProfessor: string;
  nomeDaTurma: string;
  nomeDaDisciplina: string | null;
  nomesDosRecursos: string[];
  cancelada: boolean;
  motivoDoCancelamento: string | null;
  criadaPor: string;
  professorId: string;
  gerenciavel?: boolean;
  ehPalestra?: boolean;
  inscricaoAberta?: boolean;
  inscrito?: boolean;
};

const LIMITE_DA_BUSCA = 2000;

export function reservaCorrespondeABusca(
  reserva: ReservaDaLista,
  busca: string,
): boolean {
  return correspondeABusca(
    [
      reserva.finalidade,
      reserva.nomeDoEspaco,
      reserva.predio,
      reserva.nomeDoProfessor,
      reserva.nomeDaTurma,
      reserva.nomeDaDisciplina,
      formatarPeriodo(reserva.inicio, reserva.fim),
      ...reserva.nomesDosRecursos,
    ],
    busca,
  );
}

const COLUNAS_DA_LISTAGEM =
  `id, purpose, activity_type, starts_at, ends_at, status, cancellation_reason,
       room_id, created_by, professor_id,
       rooms(name, building),
       professors(name),
       classes(name),
       subjects(name),
       booking_resources(resources(name))` as const;

type LinhaDaListagem = {
  id: string;
  purpose: string;
  activity_type: TipoDeAtividade;
  starts_at: string;
  ends_at: string;
  status: string;
  cancellation_reason: string | null;
  room_id: string;
  created_by: string;
  professor_id: string;
  rooms: { name: string; building: string };
  professors: { name: string };
  classes: { name: string };
  subjects: { name: string } | null;
  booking_resources: { resources: { name: string } }[];
};

function paraItemDaListagem(linha: LinhaDaListagem): ReservaDaLista {
  return {
    id: linha.id,
    finalidade: linha.purpose,
    tipoDeAtividade: linha.activity_type,
    inicio: paraData(linha.starts_at),
    fim: paraData(linha.ends_at),
    espacoId: linha.room_id,
    nomeDoEspaco: linha.rooms.name,
    predio: linha.rooms.building,
    nomeDoProfessor: linha.professors.name,
    nomeDaTurma: linha.classes.name,
    nomeDaDisciplina: linha.subjects?.name ?? null,
    nomesDosRecursos: linha.booking_resources.map(
      (vinculo) => vinculo.resources.name,
    ),
    cancelada: linha.status === "cancelled",
    motivoDoCancelamento: linha.cancellation_reason,
    criadaPor: linha.created_by,
    professorId: linha.professor_id,
  };
}

export type EscopoDoAluno = { cursoId: string | null; turmaIds: string[] };

function aplicarFiltros<
  Q extends {
    eq(coluna: string, valor: string): Q;
    in(coluna: string, valores: string[]): Q;
    or(condicao: string): Q;
  },
>(
  consulta: Q,
  filtros: Filtros,
  escopo: EscopoDoAluno | null,
  distinguirConcluidas: boolean,
): Q {
  let filtrada = consulta;

  if (escopo) filtrada = filtrada.in("class_id", escopo.turmaIds);

  const status = condicaoDeStatus(filtros, new Date(), distinguirConcluidas);
  if (status) filtrada = filtrada.or(status);
  if (filtros.professores.length > 0) {
    filtrada = filtrada.in("professor_id", filtros.professores);
  }
  if (filtros.turmas.length > 0) {
    filtrada = filtrada.in("class_id", filtros.turmas);
  }
  if (filtros.espacos.length > 0) {
    filtrada = filtrada.in("room_id", filtros.espacos);
  }
  if (filtros.tipos.length > 0) {
    filtrada = filtrada.in("activity_type", filtros.tipos);
  }

  return filtrada;
}

export async function listarReservasNoIntervalo({
  inicio,
  fim,
  filtros = FILTROS_PADRAO,
  escopo = null,
}: {
  inicio: Date;
  fim: Date;
  filtros?: Filtros;
  escopo?: EscopoDoAluno | null;
}): Promise<ReservaDaLista[]> {
  const supabase = await criarClienteDoServidor();

  const consulta = supabase
    .from("bookings")
    .select(COLUNAS_DA_LISTAGEM)
    .lt("starts_at", fim.toISOString())
    .gt("ends_at", inicio.toISOString())
    .order("starts_at");

  const { data, error } = await aplicarFiltros(
    consulta,
    filtros,
    escopo,
    false,
  );

  if (error) {
    throw new Error(`Falha ao listar as reservas: ${error.message}`);
  }

  return data.map(paraItemDaListagem);
}

const COLUNA_DA_ORDENACAO: Record<Ordenacao, string> = {
  data: "starts_at",
  atividade: "purpose",
  tipo: "activity_type",
  espaco: "rooms(name)",
  professor: "professors(name)",
  turma: "classes(name)",
  situacao: "status",
};

export async function listarPaginaDeReservas({
  de,
  ate,
  ordenar,
  sentido,
  filtros = FILTROS_PADRAO,
  busca = "",
  escopo = null,
}: {
  de: number;
  ate: number;
  ordenar: Ordenacao;
  sentido: Sentido;
  filtros?: Filtros;
  busca?: string;
  escopo?: EscopoDoAluno | null;
}): Promise<{ reservas: ReservaDaLista[]; total: number }> {
  const supabase = await criarClienteDoServidor();

  let consulta = supabase
    .from("bookings")
    .select(COLUNAS_DA_LISTAGEM, { count: "exact" })
    .order(COLUNA_DA_ORDENACAO[ordenar], { ascending: sentido === "asc" });

  if (ordenar !== "data")
    consulta = consulta.order("starts_at", { ascending: false });

  if (busca.trim()) {
    const { data, error } = await aplicarFiltros(
      consulta,
      filtros,
      escopo,
      true,
    ).limit(LIMITE_DA_BUSCA);

    if (error) {
      throw new Error(`Falha ao listar as reservas: ${error.message}`);
    }

    const encontradas = data
      .map(paraItemDaListagem)
      .filter((reserva) => reservaCorrespondeABusca(reserva, busca));

    return {
      reservas: encontradas.slice(de, ate + 1),
      total: encontradas.length,
    };
  }

  const { data, error, count } = await aplicarFiltros(
    consulta,
    filtros,
    escopo,
    true,
  ).range(de, ate);

  if (error) {
    throw new Error(`Falha ao listar as reservas: ${error.message}`);
  }

  return { reservas: data.map(paraItemDaListagem), total: count ?? 0 };
}

export type DesfechoDoCancelamento =
  "cancelled" | "not_found" | "already_cancelled" | "already_finished";

export async function cancelarReservaNoBanco(
  reservaId: string,
  motivo: string | null,
): Promise<DesfechoDoCancelamento> {
  const supabase = await criarClienteDoServidor();

  const { data, error } = await supabase.rpc("cancel_booking", {
    p_booking_id: reservaId,
    p_reason: motivo ?? undefined,
  });

  if (error) {
    console.error("Falha ao cancelar reserva:", error);
    throw new Error("Não foi possível cancelar a reserva.");
  }

  return data as DesfechoDoCancelamento;
}

export type DesfechoDaExclusao = "deleted" | "not_found";

export async function excluirReservaNoBanco(
  reservaId: string,
): Promise<DesfechoDaExclusao> {
  const supabase = await criarClienteDoServidor();

  const { data, error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", reservaId)
    .select("id");

  if (error) {
    console.error("Falha ao excluir reserva:", error);
    throw new Error("Não foi possível excluir a reserva.");
  }

  return data.length > 0 ? "deleted" : "not_found";
}
