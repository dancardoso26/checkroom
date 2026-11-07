import {
  diasDoPeriodo,
  ehChaveValida,
  intervaloDoPeriodo,
  lerEscala,
  lerVisao,
  somarDias,
  tituloDoPeriodo,
} from "@/domain/agenda/navegacao-da-agenda";
import { combineDateTime, localDayKey } from "@/lib/datetime";
import {
  listBookingsInRange,
  listBookingsPage,
  reservaCorrespondeABusca,
  type EscopoDoAluno,
} from "@/lib/repositories/repositorio-de-reservas";
import { listProfessors } from "@/lib/repositories/repositorio-de-professores";
import { listarParesDeDocencia } from "@/lib/repositories/repositorio-de-disciplinas";
import { listClasses } from "@/lib/repositories/repositorio-de-turmas";
import { listRooms } from "@/lib/repositories/repositorio-de-espacos";
import { palestrasNaAgenda } from "@/lib/repositories/repositorio-de-palestras";
import {
  podeCadastrarPalestra,
  podeCriarReserva,
  podeGerenciarReserva,
  podeVerPalestras,
} from "@/domain/auth/permissoes";
import type { BookingListItem } from "@/lib/repositories/repositorio-de-reservas";
import { exigirSessao } from "@/lib/sessao";
import {
  aplicarMinhas,
  FILTROS_PADRAO,
  incluiAgendadas,
  lerFiltros,
  type Filtros,
} from "@/domain/agenda/filtros-da-agenda";
import { lerTabela, paginar } from "@/domain/tabela/tabela";

import { carregarCatalogos } from "./catalogos";
import {
  Agenda,
  type NovaReserva,
  type Painel,
  type PaginaDaTabela,
} from "./agenda/agenda";
import type { EstadoDaAgenda } from "./agenda/url";

export const dynamic = "force-dynamic";

type Parametros = {
  visao?: string;
  escala?: string;
  data?: string;
  status?: string;
  professor?: string;
  turma?: string;
  espaco?: string;
  nova?: string;
  dia?: string;
  inicio?: string;
  fim?: string;
  destaque?: string;
  pagina?: string;
  ordenar?: string;
  sentido?: string;
  porPagina?: string;
  q?: string;
  tipo?: string;
  atividade?: string;
};

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  const sessao = await exigirSessao();
  const parametros = await searchParams;

  const podeReservar = podeCriarReserva(sessao);
  const comPermissao = (lista: BookingListItem[]) =>
    lista.map((reserva) => ({
      ...reserva,
      gerenciavel: !reserva.ehPalestra && podeGerenciarReserva(sessao, reserva),
    }));

  const agora = new Date();
  const hoje = localDayKey(agora);

  const turmasCarregando = listClasses();

  const escopo: EscopoDoAluno | null =
    sessao.papel === "student"
      ? {
          cursoId: sessao.cursoId,
          turmaIds: sessao.turmaId ? [sessao.turmaId] : [],
        }
      : null;

  const estado: EstadoDaAgenda = {
    visao: lerVisao(parametros.visao),
    escala: lerEscala(parametros.escala),
    data: ehChaveValida(parametros.data) ? parametros.data : hoje,
    filtros: lerFiltros(parametros, sessao.papel === "professor"),
    busca: (parametros.q ?? "").trim().slice(0, 100),
    tabela: lerTabela(parametros),
  };

  const filtrosEfetivos = aplicarMinhas(estado.filtros, sessao.professorId);

  const [
    reservas,
    tabela,
    catalogos,
    professores,
    proximos,
    espacos,
    docencia,
    todasAsTurmas,
  ] = await Promise.all([
    estado.visao === "calendario"
      ? carregarPeriodo(
          estado.escala,
          estado.data,
          filtrosEfetivos,
          estado.busca,
          escopo,
        )
      : Promise.resolve([]),
    estado.visao === "tabela"
      ? carregarTabela(estado.tabela, filtrosEfetivos, estado.busca, escopo)
      : Promise.resolve(null),
    podeReservar
      ? carregarCatalogos(hoje, {
          comCursos: podeCadastrarPalestra(sessao),
          turmas: turmasCarregando,
        })
      : Promise.resolve(null),
    listProfessors(),
    estado.visao === "calendario"
      ? carregarProximos(agora, hoje, filtrosEfetivos.professores, escopo)
      : Promise.resolve([]),
    listRooms(),
    listarParesDeDocencia(),
    turmasCarregando,
  ]);

  const painel: Painel | null = catalogos && {
    catalogos: { ...catalogos, professors: professores },
    professorFixo: sessao.papel === "admin" ? null : sessao.professorId,
    permitePalestra: podeCadastrarPalestra(sessao),
  };

  return (
    <Agenda
      estado={estado}
      titulo={tituloDoPeriodo(estado.escala, estado.data)}
      dias={diasDoPeriodo(estado.escala, estado.data)}
      hoje={hoje}
      agora={agora}
      reservas={comPermissao(reservas)}
      proximos={comPermissao(proximos)}
      tabela={tabela && { ...tabela, reservas: comPermissao(tabela.reservas) }}
      destaque={parametros.destaque}
      painel={painel}
      novaInicial={
        parametros.nova === "1" && podeReservar
          ? lerNovaReserva(parametros, hoje)
          : null
      }
      podeReservar={podeReservar}
      vePalestras={podeVerPalestras(sessao)}
      tituloDaPagina={sessao.papel === "student" ? "Minha agenda" : "Reservas"}
      professores={professores.map(({ id, name }) => ({ id, nome: name }))}
      turmas={(escopo
        ? todasAsTurmas.filter((turma) => escopo.turmaIds.includes(turma.id))
        : todasAsTurmas
      ).map(({ id, name }) => ({ id, nome: name }))}
      espacos={espacos.map(({ id, name }) => ({ id, nome: name }))}
      docencia={docencia}
    />
  );
}

async function carregarPeriodo(
  escala: EstadoDaAgenda["escala"],
  data: string,
  filtros: Filtros,
  busca: string,
  escopo: EscopoDoAluno | null,
) {
  const { inicio, fim } = intervaloDoPeriodo(escala, data);

  const comPalestras =
    incluiAgendadas(filtros) &&
    filtros.turmas.length === 0 &&
    (filtros.tipos.length === 0 || filtros.tipos.includes("lecture"));

  const [reservas, palestras] = await Promise.all([
    listBookingsInRange({ inicio, fim, filtros, escopo }),
    comPalestras
      ? palestrasNaAgenda(inicio, fim, escopo, filtros.professores)
      : Promise.resolve([]),
  ]);

  const palestrasDosEspacos = palestras.filter(
    (p) => filtros.espacos.length === 0 || filtros.espacos.includes(p.roomId),
  );

  return [...reservas, ...palestrasDosEspacos]
    .filter((reserva) => reservaCorrespondeABusca(reserva, busca))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

async function carregarProximos(
  agora: Date,
  hoje: string,
  professores: string[],
  escopo: EscopoDoAluno | null,
) {
  const fim = combineDateTime(somarDias(hoje, 31), "00:00");

  const [reservas, palestras] = await Promise.all([
    listBookingsInRange({
      inicio: agora,
      fim,
      filtros: { ...FILTROS_PADRAO, professores },
      escopo,
    }),
    palestrasNaAgenda(agora, fim, escopo, professores),
  ]);

  return [...reservas, ...palestras]
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .slice(0, 40);
}

async function carregarTabela(
  { pagina, ordenar, sentido, porPagina }: EstadoDaAgenda["tabela"],
  filtros: Filtros,
  busca: string,
  escopo: EscopoDoAluno | null,
): Promise<PaginaDaTabela> {
  const pedida = paginar(Infinity, pagina, porPagina);
  const { reservas, total } = await listBookingsPage({
    de: pedida.de,
    ate: pedida.ate,
    ordenar,
    sentido,
    filtros,
    busca,
    escopo,
  });

  const paginacao = paginar(total, pagina, porPagina);

  if (paginacao.pagina !== pagina && total > 0) {
    const ultima = await listBookingsPage({
      de: paginacao.de,
      ate: paginacao.ate,
      ordenar,
      sentido,
      filtros,
      busca,
      escopo,
    });
    return { reservas: ultima.reservas, total: ultima.total, paginacao };
  }

  return { reservas, total, paginacao };
}

function lerNovaReserva(parametros: Parametros, hoje: string): NovaReserva {
  const dia =
    ehChaveValida(parametros.dia) && parametros.dia >= hoje
      ? parametros.dia
      : hoje;
  const inicio = /^\d{2}:\d{2}$/.test(parametros.inicio ?? "")
    ? parametros.inicio
    : undefined;
  const fim =
    inicio &&
    /^\d{2}:\d{2}$/.test(parametros.fim ?? "") &&
    parametros.fim! > inicio
      ? parametros.fim
      : undefined;

  const tipo = parametros.tipo === "palestra" ? "lecture" : undefined;

  return { dia, inicio, fim, tipo };
}
