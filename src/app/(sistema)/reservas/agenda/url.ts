import type { Escala, Visao } from "@/domain/agenda/navegacao-da-agenda";
import {
  FILTROS_PADRAO,
  type Filtros,
} from "@/domain/agenda/filtros-da-agenda";
import { TABELA_PADRAO, type EstadoDaTabela } from "@/domain/tabela/tabela";

export type EstadoDaAgenda = {
  visao: Visao;
  escala: Escala;
  data: string;
  filtros: Filtros;
  busca: string;
  tabela: EstadoDaTabela;
};

export type Extras = {
  nova?: boolean;
  dia?: string;
  inicio?: string;
  fim?: string;
  destaque?: string;
};

export function hrefDaAgenda(
  estado: EstadoDaAgenda,
  extras: Extras = {},
): string {
  const parametros = new URLSearchParams({
    visao: estado.visao,
    escala: estado.escala,
    data: estado.data,
  });

  if (estado.filtros.status.join() !== FILTROS_PADRAO.status.join()) {
    parametros.set("status", estado.filtros.status.join(","));
  }
  if (estado.filtros.professores.length > 0) {
    parametros.set("professor", estado.filtros.professores.join(","));
  }
  if (estado.filtros.turmas.length > 0) {
    parametros.set("turma", estado.filtros.turmas.join(","));
  }
  if (estado.filtros.espacos.length > 0) {
    parametros.set("espaco", estado.filtros.espacos.join(","));
  }
  if (estado.filtros.tipos.length > 0) {
    parametros.set("atividade", estado.filtros.tipos.join(","));
  }
  if (estado.filtros.minhas !== null) {
    parametros.set("minhas", estado.filtros.minhas ? "1" : "0");
  }
  if (estado.busca.trim()) parametros.set("q", estado.busca.trim());

  if (estado.visao === "tabela") {
    const { pagina, ordenar, sentido, porPagina } = estado.tabela;
    if (pagina !== TABELA_PADRAO.pagina)
      parametros.set("pagina", String(pagina));
    if (porPagina !== TABELA_PADRAO.porPagina) {
      parametros.set("porPagina", String(porPagina));
    }
    if (
      ordenar !== TABELA_PADRAO.ordenar ||
      sentido !== TABELA_PADRAO.sentido
    ) {
      parametros.set("ordenar", ordenar);
      parametros.set("sentido", sentido);
    }
  }

  if (extras.nova) parametros.set("nova", "1");
  if (extras.dia) parametros.set("dia", extras.dia);
  if (extras.inicio) parametros.set("inicio", extras.inicio);
  if (extras.fim) parametros.set("fim", extras.fim);
  if (extras.destaque) parametros.set("destaque", extras.destaque);

  return `/reservas?${parametros.toString()}`;
}
