import { describe, expect, it } from "vitest";

import {
  podeAbrirChamado,
  podeAlterarUsuario,
  podeAtenderChamado,
  podeCadastrarPalestra,
  podeCancelarChamado,
  podeExcluirChamado,
  podeCriarReserva,
  podeGerenciarCadastros,
  podeInscreverEmPalestra,
  podeVerPainel,
  podeVerAgenda,
  podeVerPalestras,
  podeVerTodosOsChamados,
  podeGerenciarUsuarios,
  podeGerenciarReserva,
  podeReservarPara,
  podeVerAuditoria,
  type Ator,
} from "./permissoes";

const PROFESSOR_ANA = "11111111-1111-1111-1111-111111111111";
const PROFESSOR_CARLOS = "22222222-2222-2222-2222-222222222222";
const PERFIL_ANA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PERFIL_CARLOS = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const PERFIL_ADMIN = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const ana: Ator = {
  profileId: PERFIL_ANA,
  papel: "professor",
  professorId: PROFESSOR_ANA,
};

const carlos: Ator = {
  profileId: PERFIL_CARLOS,
  papel: "professor",
  professorId: PROFESSOR_CARLOS,
};

const admin: Ator = {
  profileId: PERFIL_ADMIN,
  papel: "admin",
  professorId: null,
};

const aluno: Ator = {
  profileId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  papel: "student",
  professorId: null,
};

describe("podeGerenciarReserva", () => {
  const aulaDaAna = { createdBy: PERFIL_ANA, professorId: PROFESSOR_ANA };

  it("permite ao professor gerenciar a própria reserva", () => {
    expect(podeGerenciarReserva(ana, aulaDaAna)).toBe(true);
  });

  it("recusa ao professor gerenciar a reserva de outro", () => {
    expect(podeGerenciarReserva(carlos, aulaDaAna)).toBe(false);
  });

  it("permite à administração gerenciar qualquer reserva", () => {
    expect(podeGerenciarReserva(admin, aulaDaAna)).toBe(true);
  });

  it("permite ao professor gerenciar a reserva que a administração registrou para ele", () => {
    const registradaPelaSecretaria = {
      createdBy: PERFIL_ADMIN,
      professorId: PROFESSOR_ANA,
    };

    expect(podeGerenciarReserva(ana, registradaPelaSecretaria)).toBe(true);
  });

  it("permite a quem registrou, mesmo que a aula seja de outro", () => {
    const registradaPelaAna = {
      createdBy: PERFIL_ANA,
      professorId: PROFESSOR_CARLOS,
    };

    expect(podeGerenciarReserva(ana, registradaPelaAna)).toBe(true);
  });

  it("não trata ausência de vínculo como vínculo em comum", () => {
    const semDono = { createdBy: "outro-perfil", professorId: PROFESSOR_ANA };

    expect(podeGerenciarReserva(aluno, semDono)).toBe(false);
  });
});

describe("podeReservarPara", () => {
  it("permite ao professor reservar para si mesmo", () => {
    expect(podeReservarPara(ana, PROFESSOR_ANA)).toBe(true);
  });

  it("recusa ao professor reservar em nome de outro", () => {
    expect(podeReservarPara(ana, PROFESSOR_CARLOS)).toBe(false);
  });

  it("permite à administração reservar em nome de qualquer professor", () => {
    expect(podeReservarPara(admin, PROFESSOR_ANA)).toBe(true);
    expect(podeReservarPara(admin, PROFESSOR_CARLOS)).toBe(true);
  });

  it("recusa a quem não tem vínculo de professor nem é administração", () => {
    expect(podeReservarPara(aluno, PROFESSOR_ANA)).toBe(false);
  });
});

describe("podeVerAuditoria", () => {
  it("permite apenas à administração", () => {
    expect(podeVerAuditoria(admin)).toBe(true);
    expect(podeVerAuditoria(ana)).toBe(false);
    expect(podeVerAuditoria(aluno)).toBe(false);
  });
});

describe("podeCriarReserva", () => {
  it("permite a quem leciona e a quem administra", () => {
    expect(podeCriarReserva(ana)).toBe(true);
    expect(podeCriarReserva(admin)).toBe(true);
  });

  it("recusa a quem não tem vínculo de professor", () => {
    expect(podeCriarReserva(aluno)).toBe(false);
  });

  it("recusa ao professor sem vínculo de professor registrado", () => {
    const semVinculo: Ator = { ...ana, professorId: null };

    expect(podeCriarReserva(semVinculo)).toBe(false);
  });
});

describe("gestão de usuários", () => {
  it("abre apenas para a administração", () => {
    expect(podeGerenciarUsuarios(admin)).toBe(true);
    expect(podeGerenciarUsuarios(ana)).toBe(false);
  });

  const alvo = (ator: Ator, ehMaster = false) => ({
    id: ator.profileId,
    papel: ator.papel,
    ehMaster,
  });
  const outroAdmin: Ator = {
    ...admin,
    profileId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  };

  it("deixa a administração alterar as demais contas, inclusive outro admin", () => {
    expect(podeAlterarUsuario(admin, alvo(ana))).toBe(true);
    expect(podeAlterarUsuario(admin, alvo(aluno))).toBe(true);
    expect(podeAlterarUsuario(admin, alvo(outroAdmin))).toBe(true);
  });

  it("nunca altera o master", () => {
    expect(podeAlterarUsuario(admin, alvo(outroAdmin, true))).toBe(false);
  });

  it("não altera a própria conta", () => {
    expect(podeAlterarUsuario(admin, alvo(admin))).toBe(false);
  });

  it("recusa a quem não administra", () => {
    expect(podeAlterarUsuario(ana, alvo(carlos))).toBe(false);
  });
});

const ti: Ator = {
  profileId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  papel: "it_support",
  professorId: null,
};

describe("cadastros e painel", () => {
  it("só a administração mantém os cadastros e vê o painel", () => {
    expect(podeGerenciarCadastros(admin)).toBe(true);
    expect(podeVerPainel(admin)).toBe(true);

    for (const ator of [ana, aluno, ti]) {
      expect(podeGerenciarCadastros(ator)).toBe(false);
      expect(podeVerPainel(ator)).toBe(false);
    }
  });
});

describe("palestras", () => {
  it("a equipe de TI não vê as palestras; os demais papéis veem", () => {
    for (const ator of [ana, aluno, admin]) {
      expect(podeVerPalestras(ator)).toBe(true);
    }
    expect(podeVerPalestras(ti)).toBe(false);
  });
});

describe("agenda", () => {
  it("a equipe de TI não vê a agenda de reservas; os demais papéis veem", () => {
    for (const ator of [ana, aluno, admin]) {
      expect(podeVerAgenda(ator)).toBe(true);
    }
    expect(podeVerAgenda(ti)).toBe(false);
  });
});

describe("chamados", () => {
  it("professor e administração abrem; aluno e TI não", () => {
    expect(podeAbrirChamado(ana)).toBe(true);
    expect(podeAbrirChamado(admin)).toBe(true);
    expect(podeAbrirChamado(aluno)).toBe(false);
    expect(podeAbrirChamado(ti)).toBe(false);
  });

  it("a equipe de TI e o administrador master atendem", () => {
    expect(podeAtenderChamado(ti)).toBe(true);
    expect(podeAtenderChamado({ ...admin, ehMaster: true })).toBe(true);
    expect(podeAtenderChamado(admin)).toBe(false);
    expect(podeAtenderChamado(ana)).toBe(false);
  });

  it("TI e administração veem a fila inteira", () => {
    expect(podeVerTodosOsChamados(ti)).toBe(true);
    expect(podeVerTodosOsChamados(admin)).toBe(true);
    expect(podeVerTodosOsChamados(ana)).toBe(false);
  });

  it("só o administrador master exclui", () => {
    expect(podeExcluirChamado({ ...admin, ehMaster: true })).toBe(true);
    expect(podeExcluirChamado(admin)).toBe(false);
    expect(podeExcluirChamado(ti)).toBe(false);
  });

  it("o solicitante e o administrador master cancelam", () => {
    expect(podeCancelarChamado(ana, { solicitanteId: PERFIL_ANA })).toBe(true);
    expect(
      podeCancelarChamado(
        { ...admin, ehMaster: true },
        { solicitanteId: PERFIL_ANA },
      ),
    ).toBe(true);
    expect(podeCancelarChamado(admin, { solicitanteId: PERFIL_ANA })).toBe(
      false,
    );
  });
});

describe("palestras", () => {
  it("a administração cadastra e o aluno se inscreve", () => {
    expect(podeCadastrarPalestra(admin)).toBe(true);
    expect(podeCadastrarPalestra(ana)).toBe(false);
    expect(podeInscreverEmPalestra(aluno)).toBe(true);
    expect(podeInscreverEmPalestra(ana)).toBe(false);
    expect(podeInscreverEmPalestra(admin)).toBe(false);
  });
});
