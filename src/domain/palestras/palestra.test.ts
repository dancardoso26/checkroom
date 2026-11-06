import { describe, expect, it } from "vitest";

import {
  recusaDaInscricaoNoBanco,
  situacaoParaOAluno,
  vagasRestantes,
  validarInscricao,
  validarPalestra,
  type DadosDaPalestra,
  type PalestraParaInscricao,
} from "./palestra";

const AGORA = new Date("2026-10-12T10:00:00-03:00");

function palestra(overrides: Partial<DadosDaPalestra> = {}): DadosDaPalestra {
  return {
    titulo: "Inteligência artificial na saúde",
    palestrante: "Dra. Fulana",
    espacoId: "auditorio",
    inicio: new Date("2026-10-20T19:00:00-03:00"),
    fim: new Date("2026-10-20T21:00:00-03:00"),
    vagas: 100,
    cursoIds: ["si"],
    ...overrides,
  };
}

const LIVRE = { capacidadeDoEspaco: 120, ocupacoes: [], agora: AGORA };

describe("validarPalestra", () => {
  it("aceita uma palestra completa num espaço livre", () => {
    expect(validarPalestra(palestra(), LIVRE)).toEqual({});
  });

  it("recusa palestra sem curso de destino", () => {
    expect(validarPalestra(palestra({ cursoIds: [] }), LIVRE).cursoIds).toEqual([
      "Selecione ao menos um curso de destino.",
    ]);
  });

  it("recusa espaço já ocupado no horário", () => {
    const erros = validarPalestra(palestra(), {
      ...LIVRE,
      ocupacoes: [
        {
          inicio: new Date("2026-10-20T20:00:00-03:00"),
          fim: new Date("2026-10-20T21:40:00-03:00"),
          descricao: "Seminário de Saúde Coletiva",
        },
      ],
    });

    expect(erros.espacoId?.[0]).toContain("Seminário de Saúde Coletiva");
  });

  it("aceita ocupação que termina quando a palestra começa", () => {
    const erros = validarPalestra(palestra(), {
      ...LIVRE,
      ocupacoes: [
        {
          inicio: new Date("2026-10-20T17:00:00-03:00"),
          fim: new Date("2026-10-20T19:00:00-03:00"),
          descricao: "Aula",
        },
      ],
    });

    expect(erros).toEqual({});
  });

  it("recusa vagas acima da capacidade do espaço", () => {
    expect(validarPalestra(palestra({ vagas: 121 }), LIVRE).vagas).toBeDefined();
  });

  it("recusa vagas zeradas", () => {
    expect(validarPalestra(palestra({ vagas: 0 }), LIVRE).vagas).toBeDefined();
  });

  it("recusa período invertido, no passado ou fora do expediente", () => {
    expect(
      validarPalestra(palestra({ fim: new Date("2026-10-20T18:00:00-03:00") }), LIVRE).fim
    ).toBeDefined();
    expect(
      validarPalestra(
        palestra({
          inicio: new Date("2026-10-01T19:00:00-03:00"),
          fim: new Date("2026-10-01T20:00:00-03:00"),
        }),
        LIVRE
      ).inicio
    ).toBeDefined();
    expect(
      validarPalestra(palestra({ fim: new Date("2026-10-20T23:00:00-03:00") }), LIVRE).inicio
    ).toBeDefined();
  });

  it("respeita o feriado e o bloqueio do próprio espaço, não o de outro", () => {
    expect(
      validarPalestra(palestra(), { ...LIVRE, bloqueios: [{ espacoId: null, motivo: "Finados" }] })
        .data
    ).toEqual(["A instituição não funciona nesta data: Finados."]);
    expect(
      validarPalestra(palestra(), {
        ...LIVRE,
        bloqueios: [{ espacoId: "auditorio", motivo: "Reforma" }],
      }).espacoId
    ).toBeDefined();
    expect(
      validarPalestra(palestra(), { ...LIVRE, bloqueios: [{ espacoId: "lab", motivo: "Reforma" }] })
    ).toEqual({});
  });

  it("exige tema e palestrante", () => {
    const erros = validarPalestra(palestra({ titulo: " ", palestrante: "" }), LIVRE);
    expect(erros.titulo).toBeDefined();
    expect(erros.palestrante).toBeDefined();
  });
});

const ABERTA: PalestraParaInscricao = {
  inicio: new Date("2026-10-20T19:00:00-03:00"),
  vagas: 2,
  inscritos: 1,
  cursoIds: ["si", "eng"],
};

describe("validarInscricao", () => {
  it("aceita aluno do curso, antes do início e com vaga", () => {
    expect(validarInscricao(ABERTA, { cursoId: "si", jaInscrito: false }, AGORA)).toBeNull();
  });

  it("recusa aluno de curso não associado", () => {
    expect(validarInscricao(ABERTA, { cursoId: "enf", jaInscrito: false }, AGORA)).toBe(
      "CURSO_NAO_ATENDIDO"
    );
    expect(validarInscricao(ABERTA, { cursoId: null, jaInscrito: false }, AGORA)).toBe(
      "CURSO_NAO_ATENDIDO"
    );
  });

  it("recusa segunda inscrição", () => {
    expect(validarInscricao(ABERTA, { cursoId: "si", jaInscrito: true }, AGORA)).toBe(
      "JA_INSCRITO"
    );
  });

  it("recusa palestra sem vagas", () => {
    expect(
      validarInscricao({ ...ABERTA, inscritos: 2 }, { cursoId: "si", jaInscrito: false }, AGORA)
    ).toBe("SEM_VAGAS");
  });

  it("recusa palestra já iniciada", () => {
    const depois = new Date("2026-10-20T19:30:00-03:00");
    expect(validarInscricao(ABERTA, { cursoId: "si", jaInscrito: false }, depois)).toBe(
      "JA_INICIADA"
    );
  });
});

describe("situacaoParaOAluno", () => {
  it("mostra inscrito antes de qualquer outra situação", () => {
    expect(
      situacaoParaOAluno({ ...ABERTA, inscritos: 2 }, { cursoId: "si", jaInscrito: true }, AGORA)
    ).toBe("inscrito");
  });

  it("distingue disponível, lotada, encerrada e fora do curso", () => {
    const aluno = { cursoId: "si", jaInscrito: false };
    expect(situacaoParaOAluno(ABERTA, aluno, AGORA)).toBe("disponivel");
    expect(situacaoParaOAluno({ ...ABERTA, inscritos: 2 }, aluno, AGORA)).toBe("lotada");
    expect(
      situacaoParaOAluno(ABERTA, aluno, new Date("2026-10-21T10:00:00-03:00"))
    ).toBe("encerrada");
    expect(situacaoParaOAluno(ABERTA, { cursoId: "enf", jaInscrito: false }, AGORA)).toBe(
      "fora_do_curso"
    );
  });
});

describe("auxiliares", () => {
  it("vagas restantes nunca ficam negativas", () => {
    expect(vagasRestantes({ vagas: 10, inscritos: 3 })).toBe(7);
    expect(vagasRestantes({ vagas: 1, inscritos: 2 })).toBe(0);
  });

  it("traduz os códigos do banco", () => {
    expect(recusaDaInscricaoNoBanco("enrolled")).toBeNull();
    expect(recusaDaInscricaoNoBanco("full")).toBe("SEM_VAGAS");
    expect(recusaDaInscricaoNoBanco("course_not_allowed")).toBe("CURSO_NAO_ATENDIDO");
    expect(recusaDaInscricaoNoBanco("already_enrolled")).toBe("JA_INSCRITO");
    expect(recusaDaInscricaoNoBanco("time_conflict")).toBe("CONFLITO_DE_HORARIO");
    expect(recusaDaInscricaoNoBanco("started")).toBe("JA_INICIADA");
    expect(recusaDaInscricaoNoBanco("not_student")).toBe("NAO_E_ALUNO");
    expect(recusaDaInscricaoNoBanco("??")).toBe("ERRO");
  });
});
