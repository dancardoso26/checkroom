import type { Escala, Visao } from "@/domain/agenda/navegacao-da-agenda";
import { FILTROS_PADRAO, type Filtros } from "@/domain/agenda/filtros-da-agenda";
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
  const params = new URLSearchParams({
    visao: estado.visao,
    escala: estado.escala,
    data: estado.data,
  });

  if (estado.filtros.status.join() !== FILTROS_PADRAO.status.join()) {
    params.set("status", estado.filtros.status.join(","));
  }
  if (estado.filtros.professores.length > 0) {
    params.set("professor", estado.filtros.professores.join(","));
  }
  if (estado.filtros.turmas.length > 0) {
    params.set("turma", estado.filtros.turmas.join(","));
  }
  if (estado.filtros.espacos.length > 0) {
    params.set("espaco", estado.filtros.espacos.join(","));
  }
  if (estado.filtros.tipos.length > 0) {
    params.set("atividade", estado.filtros.tipos.join(","));
  }
  if (estado.filtros.minhas !== null) {
    params.set("minhas", estado.filtros.minhas ? "1" : "0");
  }
  if (estado.busca.trim()) params.set("q", estado.busca.trim());

  if (estado.visao === "tabela") {
    const { pagina, ordenar, sentido, porPagina } = estado.tabela;
    if (pagina !== TABELA_PADRAO.pagina) params.set("pagina", String(pagina));
    if (porPagina !== TABELA_PADRAO.porPagina) {
      params.set("porPagina", String(porPagina));
    }
    if (
      ordenar !== TABELA_PADRAO.ordenar ||
      sentido !== TABELA_PADRAO.sentido
    ) {
      params.set("ordenar", ordenar);
      params.set("sentido", sentido);
    }
  }

  if (extras.nova) params.set("nova", "1");
  if (extras.dia) params.set("dia", extras.dia);
  if (extras.inicio) params.set("inicio", extras.inicio);
  if (extras.fim) params.set("fim", extras.fim);
  if (extras.destaque) params.set("destaque", extras.destaque);

  return `/reservas?${params.toString()}`;
}
