import { describe, expect, it } from "vitest";

import {
  podeAlterarUsuario,
  podeCriarReserva,
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

  // A secretaria registra pelo docente, e a aula continua sendo dele.
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

  // Sem esta verificação, dois perfis sem vínculo docente se enxergariam como
  // donos das reservas um do outro, porque null seria igual a null.
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

  it("permite à administração reservar em nome de qualquer docente", () => {
    expect(podeReservarPara(admin, PROFESSOR_ANA)).toBe(true);
    expect(podeReservarPara(admin, PROFESSOR_CARLOS)).toBe(true);
  });

  it("recusa a quem não tem vínculo docente nem é administração", () => {
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

  it("recusa a quem não tem vínculo docente", () => {
    expect(podeCriarReserva(aluno)).toBe(false);
  });

  // Um professor sem vínculo cadastrado não consegue reservar, e é o mesmo
  // caminho que já impede reservar disciplina que não leciona.
  it("recusa ao professor sem vínculo docente registrado", () => {
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
