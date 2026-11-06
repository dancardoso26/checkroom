export type Papel = "student" | "professor" | "it_support" | "admin";

export const ROTULO_DO_PAPEL: Record<Papel, string> = {
  student: "Aluno",
  professor: "Professor",
  it_support: "Equipe de TI",
  admin: "Administrador",
};

export type Ator = {
  profileId: string;
  papel: Papel;
  professorId: string | null;
  ehMaster?: boolean;
};

export type ReservaAlvo = {
  createdBy: string;
  professorId: string;
};

export function podeGerenciarReserva(
  ator: Ator,
  reserva: ReservaAlvo,
): boolean {
  if (ator.papel === "admin") return true;
  if (reserva.createdBy === ator.profileId) return true;

  return ator.professorId !== null && reserva.professorId === ator.professorId;
}

export function podeReservarPara(ator: Ator, professorId: string): boolean {
  if (ator.papel === "admin") return true;

  return ator.professorId !== null && ator.professorId === professorId;
}

export function podeVerAuditoria(ator: Ator): boolean {
  return ator.papel === "admin";
}

export function podeCriarReserva(ator: Ator): boolean {
  return ator.papel === "admin" || ator.professorId !== null;
}

export function podeGerenciarUsuarios(ator: Ator): boolean {
  return ator.papel === "admin";
}

export function podeGerenciarCadastros(ator: Ator): boolean {
  return ator.papel === "admin";
}

export function podeAbrirChamado(ator: Ator): boolean {
  return ator.papel === "professor" || ator.papel === "admin";
}

export function podeAtenderChamado(ator: Ator): boolean {
  return ator.papel === "it_support" || ator.ehMaster === true;
}

export function podeVerTodosOsChamados(ator: Ator): boolean {
  return ator.papel === "it_support" || ator.papel === "admin";
}

export type ChamadoAlvo = { solicitanteId: string };

export function podeCancelarChamado(ator: Ator, chamado: ChamadoAlvo): boolean {
  return chamado.solicitanteId === ator.profileId || ator.ehMaster === true;
}

export function podeExcluirChamado(ator: Ator): boolean {
  return ator.ehMaster === true;
}

export function podeVerPalestras(ator: Ator): boolean {
  return ator.papel !== "it_support";
}

export function podeCadastrarPalestra(ator: Ator): boolean {
  return ator.papel === "admin";
}

export function podeInscreverEmPalestra(ator: Ator): boolean {
  return ator.papel === "student";
}

export function podeVerPainel(ator: Ator): boolean {
  return ator.papel === "admin";
}

export type AlvoDeGestao = { id: string; papel: Papel; ehMaster: boolean };

export function podeAlterarUsuario(ator: Ator, alvo: AlvoDeGestao): boolean {
  return ator.papel === "admin" && !alvo.ehMaster && alvo.id !== ator.profileId;
}

export const PAPEIS_ATRIBUIVEIS: Papel[] = [
  "professor",
  "student",
  "it_support",
  "admin",
];
