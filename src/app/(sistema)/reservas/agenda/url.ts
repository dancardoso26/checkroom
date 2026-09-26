import type { Escala, Visao } from "@/lib/calendario";
import { FILTROS_PADRAO, type Filtros } from "@/lib/filtros";
import { TABELA_PADRAO, type EstadoDaTabela } from "@/lib/tabela";

export type EstadoDaAgenda = {
  visao: Visao;
  escala: Escala;
  data: string;
  filtros: Filtros;
  tabela: EstadoDaTabela;
};

export type Extras = {
  nova?: boolean;
  dia?: string;
  inicio?: string;
  fim?: string;
  destaque?: string;
};

// O estado vive na URL, e não em memória: sobrevive a recarregar a página, vai
// junto num link copiado e deixa o botão voltar do navegador funcionando.
export function hrefDaAgenda(
  estado: EstadoDaAgenda,
  extras: Extras = {}
): string {
  const params = new URLSearchParams({
    visao: estado.visao,
    escala: estado.escala,
    data: estado.data,
  });

  if (estado.filtros.status !== FILTROS_PADRAO.status) {
    params.set("status", estado.filtros.status);
  }
  if (estado.filtros.professor)
    params.set("professor", estado.filtros.professor);

  // Só o que foge do padrão vai para a URL, para o link continuar legível.
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
