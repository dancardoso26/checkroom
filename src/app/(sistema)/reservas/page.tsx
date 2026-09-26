import {
  diasDoPeriodo,
  ehChaveValida,
  intervaloDoPeriodo,
  lerEscala,
  lerVisao,
  tituloDoPeriodo,
} from "@/lib/calendario";
import { localDayKey } from "@/lib/datetime";
import {
  listBookingsInRange,
  listBookingsPage,
} from "@/lib/repositories/bookingRepository";
import { listClasses } from "@/lib/repositories/classRepository";
import { listProfessors } from "@/lib/repositories/professorRepository";
import { listResources } from "@/lib/repositories/resourceRepository";
import { listRooms } from "@/lib/repositories/roomRepository";
import {
  listSubjects,
  listTeachingAssignments,
} from "@/lib/repositories/subjectRepository";
import { PERIODO_LETIVO_VIGENTE } from "@/domain/booking/businessHours";
import { exigirSessao } from "@/lib/sessao";
import { lerFiltros, type Filtros } from "@/lib/filtros";
import { lerTabela, paginar } from "@/lib/tabela";

import { Agenda, type Painel, type PaginaDaTabela } from "./agenda/agenda";
import type { EstadoDaAgenda } from "./agenda/url";

export const dynamic = "force-dynamic";

type Parametros = {
  visao?: string;
  escala?: string;
  data?: string;
  status?: string;
  professor?: string;
  nova?: string;
  dia?: string;
  inicio?: string;
  fim?: string;
  destaque?: string;
  pagina?: string;
  ordenar?: string;
  sentido?: string;
  porPagina?: string;
};

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  const sessao = await exigirSessao();
  const parametros = await searchParams;

  const agora = new Date();
  const hoje = localDayKey(agora);

  const estado: EstadoDaAgenda = {
    visao: lerVisao(parametros.visao),
    escala: lerEscala(parametros.escala),
    data: ehChaveValida(parametros.data) ? parametros.data : hoje,
    filtros: lerFiltros(parametros),
    tabela: lerTabela(parametros),
  };

  // Cada visão consulta só o que mostra: o calendário, o período navegado; a
  // tabela, uma página do histórico inteiro.
  const [reservas, tabela, painel, professores] = await Promise.all([
    estado.visao === "calendario"
      ? carregarPeriodo(estado.escala, estado.data, estado.filtros)
      : Promise.resolve([]),
    estado.visao === "tabela"
      ? carregarTabela(estado.tabela, estado.filtros)
      : Promise.resolve(null),
    parametros.nova === "1"
      ? carregarPainel(parametros, sessao, hoje)
      : Promise.resolve(null),
    listProfessors(),
  ]);

  return (
    <Agenda
      estado={estado}
      titulo={tituloDoPeriodo(estado.escala, estado.data)}
      dias={diasDoPeriodo(estado.escala, estado.data)}
      hoje={hoje}
      agora={agora}
      reservas={reservas}
      tabela={tabela}
      destaque={parametros.destaque}
      painel={painel}
      professores={professores.map(({ id, name }) => ({ id, nome: name }))}
    />
  );
}

function carregarPeriodo(
  escala: EstadoDaAgenda["escala"],
  data: string,
  filtros: Filtros
) {
  const { inicio, fim } = intervaloDoPeriodo(escala, data);
  return listBookingsInRange({ inicio, fim, filtros });
}

async function carregarTabela(
  { pagina, ordenar, sentido, porPagina }: EstadoDaAgenda["tabela"],
  filtros: Filtros
): Promise<PaginaDaTabela> {
  const pedida = paginar(Infinity, pagina, porPagina);
  const { reservas, total } = await listBookingsPage({
    de: pedida.de,
    ate: pedida.ate,
    ordenar,
    sentido,
    filtros,
  });

  const paginacao = paginar(total, pagina, porPagina);

  // Página além da última, por um link antigo: busca de novo a última que existe.
  if (paginacao.pagina !== pagina && total > 0) {
    const ultima = await listBookingsPage({
      de: paginacao.de,
      ate: paginacao.ate,
      ordenar,
      sentido,
      filtros,
    });
    return { reservas: ultima.reservas, total: ultima.total, paginacao };
  }

  return { reservas, total, paginacao };
}

// Os catálogos só são buscados com o painel aberto: navegar entre semanas não
// precisa de salas, turmas e disciplinas, e seriam seis consultas a cada clique.
async function carregarPainel(
  parametros: Parametros,
  sessao: Awaited<ReturnType<typeof exigirSessao>>,
  hoje: string
): Promise<Painel> {
  const [rooms, professors, classes, resources, subjects, assignments] =
    await Promise.all([
      listRooms(),
      listProfessors(),
      listClasses(),
      listResources(),
      listSubjects(),
      listTeachingAssignments(PERIODO_LETIVO_VIGENTE),
    ]);

  const dia =
    ehChaveValida(parametros.dia) && parametros.dia >= hoje
      ? parametros.dia
      : hoje;
  const inicio = /^\d{2}:\d{2}$/.test(parametros.inicio ?? "")
    ? parametros.inicio
    : undefined;
  // O término só vale junto de um início anterior a ele, vindo do arraste.
  const fim =
    inicio &&
    /^\d{2}:\d{2}$/.test(parametros.fim ?? "") &&
    parametros.fim! > inicio
      ? parametros.fim
      : undefined;

  return {
    catalogos: { rooms, professors, classes, resources, subjects, assignments },
    professorFixo: sessao.papel === "admin" ? null : sessao.professorId,
    dia,
    inicio,
    fim,
  };
}
