import { describe, expect, it } from "vitest";

import {
  aplicarMinhas,
  contarFiltrosAtivos,
  incluiAgendadas,
  lerFiltros,
  type Filtros,
  condicaoDeStatus,
} from "./filtros-da-agenda";

const PROFESSOR = "11111111-1111-1111-1111-111111111111";
const OUTRO = "22222222-2222-2222-2222-222222222222";

describe("leitura dos filtros", () => {
  it("mostra só as agendadas quando a URL não diz nada", () => {
    expect(lerFiltros({})).toEqual({
      status: ["agendadas"],
      professores: [],
      turmas: [],
      espacos: [],
      tipos: [],
      minhas: null,
    });
  });

  it("aceita vários status e ignora o resto", () => {
    expect(lerFiltros({ status: "agendadas,canceladas" }).status).toEqual([
      "agendadas",
      "canceladas",
    ]);
    expect(lerFiltros({ status: "todas" }).status).toEqual([
      "agendadas",
      "concluidas",
      "canceladas",
    ]);
    expect(lerFiltros({ status: "canceladas" }).status).toEqual(["canceladas"]);
    expect(lerFiltros({ status: "qualquer" }).status).toEqual(["agendadas"]);
  });

  it("aceita várias atividades conhecidas", () => {
    expect(lerFiltros({ atividade: "exam,class,x" }).tipos).toEqual([
      "class",
      "exam",
    ]);
  });

  it("só aceita professores com formato de identificador", () => {
    expect(
      lerFiltros({ professor: `${PROFESSOR},ana,${OUTRO}` }).professores,
    ).toEqual([PROFESSOR, OUTRO]);
    expect(lerFiltros({ professor: "ana" }).professores).toEqual([]);
  });
});

describe("status no banco", () => {
  it("traduz os status marcados em uma condição do banco", () => {
    const base = {
      professores: [],
      turmas: [],
      espacos: [],
      tipos: [],
      minhas: null,
    };
    const agora = new Date("2026-11-06T12:00:00.000Z");
    const em = (status: Filtros["status"], distinguir = true) =>
      condicaoDeStatus({ ...base, status }, agora, distinguir);

    expect(em(["agendadas"])).toBe(
      "and(status.eq.active,ends_at.gt.2026-11-06T12:00:00.000Z)",
    );
    expect(em(["concluidas"])).toBe(
      "and(status.eq.active,ends_at.lte.2026-11-06T12:00:00.000Z)",
    );
    expect(em(["canceladas"])).toBe("status.eq.cancelled");
    expect(em(["agendadas", "concluidas", "canceladas"])).toBeNull();
    expect(em(["agendadas"], false)).toBe("status.eq.active");
    expect(em(["concluidas"], false)).toBe("status.eq.active");
    expect(em(["agendadas", "canceladas"], false)).toBeNull();
    expect(incluiAgendadas({ ...base, status: ["canceladas"] })).toBe(false);
  });
});

it("conta só os filtros que fogem do padrão", () => {
  expect(
    contarFiltrosAtivos({
      status: ["agendadas"],
      professores: [],
      turmas: [],
      espacos: [],
      tipos: [],
      minhas: null,
    }),
  ).toBe(0);
  expect(
    contarFiltrosAtivos({
      status: ["agendadas", "canceladas"],
      professores: [PROFESSOR],
      turmas: [OUTRO],
      espacos: [],
      tipos: ["exam", "class"],
      minhas: null,
    }),
  ).toBe(4);
});

describe("filtro de minhas reservas", () => {
  it("não existe para quem não é professor", () => {
    expect(lerFiltros({}, false).minhas).toBeNull();
    expect(lerFiltros({ minhas: "1" }, false).minhas).toBeNull();
  });

  it("vem ligado por padrão para o professor", () => {
    expect(lerFiltros({}, true).minhas).toBe(true);
  });

  it("desliga quando a URL diz 0 ou quando há professor escolhido", () => {
    expect(lerFiltros({ minhas: "0" }, true).minhas).toBe(false);
    expect(lerFiltros({ professor: OUTRO }, true)).toMatchObject({
      minhas: false,
      professores: [OUTRO],
    });
  });

  it("ligado ignora a lista de professores", () => {
    expect(
      lerFiltros({ minhas: "1", professor: OUTRO }, true).professores,
    ).toEqual([]);
  });

  it("troca os professores pelo próprio quando ligado", () => {
    const base = lerFiltros({}, true);
    expect(aplicarMinhas(base, PROFESSOR).professores).toEqual([PROFESSOR]);
    expect(
      aplicarMinhas({ ...base, minhas: false }, PROFESSOR).professores,
    ).toEqual([]);
    expect(aplicarMinhas(base, null).professores).toEqual([]);
  });

  it("conta como filtro ativo quando ligado", () => {
    expect(contarFiltrosAtivos(lerFiltros({}, true))).toBe(1);
  });
});
