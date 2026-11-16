import { validarReserva } from "./validar-reserva";
import type {
  ContextoDaReserva,
  PedidoDeReserva,
  ViolacaoDaReserva,
  EspacoParaReserva,
} from "./tipos";

export type AvaliacaoDoEspaco = {
  espaco: EspacoParaReserva;
  compativel: boolean;
  violacoes: ViolacaoDaReserva[];
};

const VIOLACOES_DO_ESPACO = new Set<ViolacaoDaReserva["codigo"]>([
  "CONFLITO_DE_ESPACO",
  "CAPACIDADE_INSUFICIENTE",
  "RECURSOS_FALTANTES",
  "ESPACO_NAO_ENCONTRADO",
  "ESPACO_BLOQUEADO",
]);

export function avaliarEspacos(
  pedido: Omit<PedidoDeReserva, "espacoId">,
  espacos: EspacoParaReserva[],
  contexto: Omit<ContextoDaReserva, "espaco">,
): AvaliacaoDoEspaco[] {
  const avaliacoes = espacos.map((espaco) => {
    const resultado = validarReserva(
      { ...pedido, espacoId: espaco.id },
      { ...contexto, espaco },
    );

    const violacoes = resultado.valida
      ? []
      : resultado.violacoes.filter((v) => VIOLACOES_DO_ESPACO.has(v.codigo));

    return {
      espaco,
      compativel: resultado.valida,
      violacoes,
    };
  });

  return ordenar(avaliacoes);
}

function ordenar(avaliacoes: AvaliacaoDoEspaco[]): AvaliacaoDoEspaco[] {
  return [...avaliacoes].sort((a, b) => {
    if (a.compativel !== b.compativel) {
      return a.compativel ? -1 : 1;
    }

    if (a.compativel && b.compativel) {
      return a.espaco.capacidade - b.espaco.capacidade;
    }

    return (
      a.espaco.predio.localeCompare(b.espaco.predio, "pt-BR") ||
      a.espaco.nome.localeCompare(b.espaco.nome, "pt-BR", { numeric: true })
    );
  });
}

export function encontrarConflitosDeHorario(
  pedido: Omit<PedidoDeReserva, "espacoId">,
  contexto: Omit<ContextoDaReserva, "espaco">,
): ViolacaoDaReserva[] {
  const espacoNeutro: EspacoParaReserva = {
    id: "__nenhum__",
    nome: "",
    predio: "",
    capacidade: Number.MAX_SAFE_INTEGER,
    recursoIds: [...pedido.recursosExigidos],
  };

  const resultado = validarReserva(
    { ...pedido, espacoId: espacoNeutro.id },
    { ...contexto, espaco: espacoNeutro },
  );

  if (resultado.valida) return [];

  return resultado.violacoes.filter((v) => !VIOLACOES_DO_ESPACO.has(v.codigo));
}
