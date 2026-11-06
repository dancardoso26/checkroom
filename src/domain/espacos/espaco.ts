import { normalizar } from "@/domain/tabela/busca";
import type { ErrosPorCampo } from "@/domain/formulario/validacao";

export type TipoDeEspaco = "classroom" | "laboratory" | "auditorium";

export const TIPOS_DE_ESPACO: TipoDeEspaco[] = [
  "classroom",
  "laboratory",
  "auditorium",
];

export const ROTULO_DO_TIPO: Record<TipoDeEspaco, string> = {
  classroom: "Sala de aula",
  laboratory: "Laboratório",
  auditorium: "Auditório",
};

export const ANDARES = ["S", "T", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export function rotuloDoAndar(andar: string): string {
  if (andar === "S") return "Subsolo";
  if (andar === "T") return "Térreo";
  return `${andar}º andar`;
}

export function codigoDoEspaco(predio: number, andar: string, sala: number): string {
  return `${predio}${andar.toUpperCase()}-${String(sala).padStart(2, "0")}`;
}

export const PREDIO_MAXIMO = 99;
export const SALA_MAXIMA = 999;

export const CAPACIDADE_MAXIMA = 2000;

export type DadosDoEspaco = {
  id: string | null;
  predio: number;
  andar: string;
  sala: number;
  capacidade: number;
  tipo: TipoDeEspaco;
  recursoIds: string[];
};

export type EspacoExistente = {
  id: string;
  predio: number;
  andar: string;
  sala: number;
};

function inteiroEntre(valor: number, minimo: number, maximo: number): boolean {
  return Number.isInteger(valor) && valor >= minimo && valor <= maximo;
}

export function validarEspaco(
  dados: DadosDoEspaco,
  existentes: EspacoExistente[]
): ErrosPorCampo {
  const erros: ErrosPorCampo = {};

  if (!inteiroEntre(dados.predio, 1, PREDIO_MAXIMO)) {
    erros.predio = [`Informe o número do prédio, de 1 a ${PREDIO_MAXIMO}.`];
  }

  if (!(ANDARES as readonly string[]).includes(dados.andar.toUpperCase())) {
    erros.andar = ["Selecione o andar."];
  }

  if (!inteiroEntre(dados.sala, 1, SALA_MAXIMA)) {
    erros.sala = [`Informe o número da sala, de 1 a ${SALA_MAXIMA}.`];
  }

  if (!Number.isInteger(dados.capacidade) || dados.capacidade <= 0) {
    erros.capacidade = ["A capacidade deve ser um número inteiro maior que zero."];
  } else if (dados.capacidade > CAPACIDADE_MAXIMA) {
    erros.capacidade = [
      `A capacidade deve ser de no máximo ${CAPACIDADE_MAXIMA} pessoas.`,
    ];
  }

  const duplicado = existentes.some(
    (outro) =>
      outro.id !== dados.id &&
      outro.predio === dados.predio &&
      normalizar(outro.andar) === normalizar(dados.andar) &&
      outro.sala === dados.sala
  );

  if (!erros.predio && !erros.andar && !erros.sala && duplicado) {
    erros.sala = [
      `Já existe o espaço ${codigoDoEspaco(dados.predio, dados.andar, dados.sala)}.`,
    ];
  }

  return erros;
}

export type DadosDoRecurso = { id: string | null; nome: string };

export function validarRecurso(
  dados: DadosDoRecurso,
  existentes: { id: string; nome: string }[]
): ErrosPorCampo {
  if (dados.nome.trim() === "") return { nome: ["Informe o nome do recurso."] };

  const duplicado = existentes.some(
    (outro) =>
      outro.id !== dados.id && normalizar(outro.nome) === normalizar(dados.nome)
  );

  return duplicado ? { nome: ["Já existe um recurso com este nome."] } : {};
}
