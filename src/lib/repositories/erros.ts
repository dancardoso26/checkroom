export type FalhaDoBanco =
  | "duplicado"
  | "em_uso"
  | "invalido"
  | "conflito"
  | "erro";

export function classificarErro(erro: { code?: string }): FalhaDoBanco {
  switch (erro.code) {
    case "23505":
      return "duplicado";
    case "23503":
      return "em_uso";
    case "23514":
      return "invalido";
    case "23P01":
      return "conflito";
    default:
      return "erro";
  }
}

export type ResultadoDaGravacao =
  | { ok: true; id: string }
  | { ok: false; falha: FalhaDoBanco | "nao_encontrado" };

export type ResultadoDaExclusao =
  | { ok: true }
  | { ok: false; falha: FalhaDoBanco | "nao_encontrado" };
