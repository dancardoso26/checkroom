import { ROTULO_DO_PAPEL, type Papel } from "@/domain/auth/permissoes";
import { formatDate, formatTime } from "@/lib/datetime";

export type EventoDeAuditoria = {
  action: string;
  entity: string;
  entityId?: string | null;
  beforeState: unknown;
  afterState: unknown;
};

export type Catalogo = {
  espacos: Map<string, string>;
  professores: Map<string, string>;
  contas: Map<string, string>;
  recursos?: Map<string, string>;
  disciplinas?: Map<string, string>;
  turmas?: Map<string, string>;
  palestras?: Map<string, string>;
};

export type Descricao = {
  acao: string;
  detalhe: string;
};

const ACAO_DE_AUTENTICACAO: Record<string, string> = {
  login: "Entrou",
  login_failed: "Acesso recusado",
  logout: "Saiu",
  password_reset_requested: "Recuperação de senha",
  password_changed: "Trocou a senha",
  mfa_enrolled: "Segundo fator",
  terms_accepted: "Aceitou os termos",
  account_anonymized: "Removeu a conta",
  user_removed: "Removeu usuário",
  user_deactivated: "Desativou usuário",
  user_reactivated: "Reativou usuário",
  user_role_changed: "Alterou papel",
  user_invited: "Convidou usuário",
};

function campo(estado: unknown, nome: string): string | null {
  if (!estado || typeof estado !== "object") return null;
  const valor = (estado as Record<string, unknown>)[nome];
  return typeof valor === "string" && valor !== "" ? valor : null;
}

function rotulo(estado: unknown): string {
  const papel = campo(estado, "role");
  return papel
    ? (ROTULO_DO_PAPEL[papel as Papel] ?? papel)
    : "papel desconhecido";
}

function periodo(inicio: string | null, fim: string | null): string | null {
  if (!inicio || !fim) return null;
  const [de, ate] = [new Date(inicio), new Date(fim)];
  return `${formatDate(de)}, ${formatTime(de)} às ${formatTime(ate)}`;
}

function descreverReserva(
  evento: EventoDeAuditoria,
  catalogo: Catalogo
): Descricao {
  const { action, beforeState, afterState } = evento;
  const estado = afterState ?? beforeState;

  const finalidade = campo(estado, "purpose") ?? "sem finalidade";
  const espaco = catalogo.espacos.get(campo(estado, "room_id") ?? "");
  const professor = catalogo.professores.get(
    campo(estado, "professor_id") ?? ""
  );
  const quando = periodo(campo(estado, "starts_at"), campo(estado, "ends_at"));

  const partes = [
    `"${finalidade}"`,
    espaco,
    quando,
    professor && `professor ${professor}`,
  ].filter(Boolean);

  let acao =
    { insert: "Criou", update: "Alterou", delete: "Excluiu" }[action] ?? action;

  const cancelou =
    action === "update" &&
    campo(beforeState, "status") !== "cancelled" &&
    campo(afterState, "status") === "cancelled";

  if (cancelou) {
    acao = "Cancelou";
    const motivo = campo(afterState, "cancellation_reason");
    if (motivo) partes.push(`motivo: ${motivo}`);
  }

  return { acao, detalhe: `Reserva ${partes.join(", ")}` };
}

function descreverEventoDeConta(
  evento: EventoDeAuditoria,
  catalogo: Catalogo
): Descricao {
  const acao = ACAO_DE_AUTENTICACAO[evento.action] ?? evento.action;
  const estado = evento.afterState;

  const email = campo(estado, "email");
  const alvo = catalogo.contas.get(campo(estado, "alvo") ?? "");

  const detalhes: Record<string, string> = {
    login: "Entrou no sistema",
    login_failed: `Tentativa de entrada com o e-mail ${email ?? "não informado"}`,
    logout: "Saiu do sistema",
    password_reset_requested: `Pediu recuperação de senha para ${email ?? "e-mail não informado"}`,
    password_changed: "Trocou a própria senha",
    mfa_enrolled: "Cadastrou o aplicativo de autenticação",
    terms_accepted: `Aceitou os termos de uso${campo(estado, "versao") ? `, versão ${campo(estado, "versao")}` : ""}`,
    account_anonymized: "Removeu a própria conta",
    user_removed: "Removeu um usuário",
    user_deactivated: `Desativou o usuário ${alvo ?? "removido"}`,
    user_reactivated: `Reativou o usuário ${alvo ?? "removido"}`,
    user_invited: `Convidou ${email ?? "um usuário"} como ${rotulo(estado)}`,
    user_role_changed:
      rotulo(evento.beforeState) === rotulo(estado)
        ? `Alterou o curso de ${alvo ?? "um usuário"}`
        : `Mudou ${alvo ?? "um usuário"} de ${rotulo(evento.beforeState)} para ${rotulo(estado)}`,
  };

  return { acao, detalhe: detalhes[evento.action] ?? evento.action };
}

const VERBO: Record<string, string> = {
  insert: "Cadastrou",
  update: "Alterou",
  delete: "Excluiu",
};

const PRIORIDADE: Record<string, string> = {
  high: "alta",
  medium: "média",
  low: "baixa",
};

function resumir(texto: string | null, limite = 80): string {
  if (!texto) return "";
  return texto.length > limite ? `${texto.slice(0, limite - 1)}…` : texto;
}

function descreverCadastro(
  evento: EventoDeAuditoria,
  catalogo: Catalogo
): Descricao | null {
  const { action, entity, beforeState, afterState } = evento;
  const estado = afterState ?? beforeState;
  const nome = campo(estado, "name");
  const acao = VERBO[action] ?? action;

  switch (entity) {
    case "rooms": {
      if (action === "room_resources_changed") {
        const nomes = (lista: unknown) =>
          Array.isArray(lista) && lista.length > 0
            ? lista.map((id) => catalogo.recursos?.get(String(id)) ?? "recurso removido").join(", ")
            : "nenhum";
        const antes = (beforeState as { resource_ids?: unknown } | null)?.resource_ids;
        const depois = (afterState as { resource_ids?: unknown } | null)?.resource_ids;

        return {
          acao: "Alterou recursos",
          detalhe: `Recursos de ${catalogo.espacos.get(evento.entityId ?? "") ?? "um espaço"}: de ${nomes(antes)} para ${nomes(depois)}`,
        };
      }
      return { acao, detalhe: `Espaço ${nome ?? ""}` };
    }
    case "resources":
      return { acao, detalhe: `Recurso ${nome ?? ""}` };
    case "courses":
      return { acao, detalhe: `Curso ${nome ?? ""}` };
    case "subjects":
      return { acao, detalhe: `Disciplina ${nome ?? ""}` };
    case "classes": {
      const alunos = (estado as { student_count?: number } | null)?.student_count;
      return { acao, detalhe: `Turma ${nome ?? ""}${alunos ? `, ${alunos} alunos` : ""}` };
    }
    case "professors":
      return { acao, detalhe: `Professor ${nome ?? "removido"}` };
    case "academic_terms":
      return {
        acao,
        detalhe: `Período letivo ${campo(estado, "code") ?? ""}, de ${campo(estado, "starts_on") ?? "?"} a ${campo(estado, "ends_on") ?? "?"}`,
      };
    case "calendar_blocks": {
      const espaco = campo(estado, "room_id");
      return {
        acao,
        detalhe: `Bloqueio "${campo(estado, "reason") ?? ""}", de ${campo(estado, "starts_on") ?? "?"} a ${campo(estado, "ends_on") ?? "?"}, ${espaco ? (catalogo.espacos.get(espaco) ?? "espaço removido") : "todos os espaços"}`,
      };
    }
    case "teaching_assignments": {
      const partes = [
        catalogo.professores.get(campo(estado, "professor_id") ?? "") ?? "professor removido",
        catalogo.disciplinas?.get(campo(estado, "subject_id") ?? ""),
        catalogo.turmas?.get(campo(estado, "class_id") ?? ""),
        campo(estado, "term") && `período ${campo(estado, "term")}`,
      ].filter(Boolean);
      return { acao, detalhe: `Vínculo de professor: ${partes.join(", ")}` };
    }
    default:
      return null;
  }
}

function descreverChamado(evento: EventoDeAuditoria, catalogo: Catalogo): Descricao {
  const { action, beforeState, afterState } = evento;
  const estado = afterState ?? beforeState;
  const espaco = catalogo.espacos.get(campo(estado, "room_id") ?? "") ?? "espaço removido";
  const problema = resumir(campo(estado, "description"));
  const antes = campo(beforeState, "status");
  const depois = campo(afterState, "status");

  if (action === "insert") {
    return {
      acao: "Abriu chamado",
      detalhe: `Chamado em ${espaco}, prioridade ${PRIORIDADE[campo(estado, "priority") ?? ""] ?? "não informada"}: ${problema}`,
    };
  }

  if (action === "update" && antes !== depois) {
    const acao =
      { in_progress: "Assumiu chamado", resolved: "Resolveu chamado", cancelled: "Cancelou chamado" }[
        depois ?? ""
      ] ?? "Alterou chamado";
    const nota = depois === "resolved" ? `. Solução: ${resumir(campo(afterState, "resolution_note"))}` : "";
    return { acao, detalhe: `Chamado em ${espaco}: ${problema}${nota}` };
  }

  return { acao: VERBO[action] ?? action, detalhe: `Chamado em ${espaco}: ${problema}` };
}

function descreverPalestra(evento: EventoDeAuditoria, catalogo: Catalogo): Descricao {
  const { action, entity, beforeState, afterState } = evento;
  const estado = afterState ?? beforeState;

  if (entity === "lecture_enrollments") {
    const titulo = catalogo.palestras?.get(campo(estado, "lecture_id") ?? "") ?? "palestra excluída";
    return {
      acao: action === "delete" ? "Cancelou inscrição" : "Inscreveu-se",
      detalhe: `Inscrição na palestra "${titulo}"`,
    };
  }

  const partes = [
    `"${campo(estado, "title") ?? ""}"`,
    catalogo.espacos.get(campo(estado, "room_id") ?? ""),
    periodo(campo(estado, "starts_at"), campo(estado, "ends_at")),
  ].filter(Boolean);

  return { acao: VERBO[action] ?? action, detalhe: `Palestra ${partes.join(", ")}` };
}

export function descreverEvento(
  evento: EventoDeAuditoria,
  catalogo: Catalogo
): Descricao {
  switch (evento.entity) {
    case "bookings":
      return descreverReserva(evento, catalogo);
    case "tickets":
      return descreverChamado(evento, catalogo);
    case "lectures":
    case "lecture_enrollments":
      return descreverPalestra(evento, catalogo);
    default:
      return descreverCadastro(evento, catalogo) ?? descreverEventoDeConta(evento, catalogo);
  }
}
