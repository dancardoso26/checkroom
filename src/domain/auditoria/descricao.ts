import { ROTULO_DO_PAPEL, type Papel } from "@/domain/auth/permissoes";
import { formatDate, formatTime } from "@/lib/datetime";

export type EventoDeAuditoria = {
  action: string;
  entity: string;
  beforeState: unknown;
  afterState: unknown;
};

/** Nomes que o registro só guarda como identificador. */
export type Catalogo = {
  espacos: Map<string, string>;
  professores: Map<string, string>;
  contas: Map<string, string>;
};

export type Descricao = {
  /** O verbo que aparece no selo da coluna Ação. */
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
  // Na exclusão só existe o estado anterior.
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
    user_role_changed: `Mudou ${alvo ?? "um usuário"} de ${rotulo(evento.beforeState)} para ${rotulo(estado)}`,
  };

  return { acao, detalhe: detalhes[evento.action] ?? evento.action };
}

export function descreverEvento(
  evento: EventoDeAuditoria,
  catalogo: Catalogo
): Descricao {
  if (evento.entity === "bookings") return descreverReserva(evento, catalogo);
  return descreverEventoDeConta(evento, catalogo);
}
