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
  /** Nulo para quem não leciona, como a administração. */
  professorId: string | null;
};

export type ReservaAlvo = {
  createdBy: string;
  professorId: string;
};

// Espelha a política "altera a propria reserva" do banco. As duas precisam
// dizer a mesma coisa: esta dá a mensagem, aquela dá a garantia.
export function podeGerenciarReserva(
  ator: Ator,
  reserva: ReservaAlvo
): boolean {
  if (ator.papel === "admin") return true;
  if (reserva.createdBy === ator.profileId) return true;

  return ator.professorId !== null && reserva.professorId === ator.professorId;
}

// A administração reserva em nome de qualquer docente, que é a secretaria
// registrando pelo professor. O professor só reserva para si.
export function podeReservarPara(ator: Ator, professorId: string): boolean {
  if (ator.papel === "admin") return true;

  return ator.professorId !== null && ator.professorId === professorId;
}

export function podeVerAuditoria(ator: Ator): boolean {
  return ator.papel === "admin";
}

// Quem não leciona nem administra não tem o que fazer no formulário: aluno e
// equipe de TI entram no ciclo 2, com palestras e chamados.
export function podeCriarReserva(ator: Ator): boolean {
  return ator.papel === "admin" || ator.professorId !== null;
}

export function podeGerenciarUsuarios(ator: Ator): boolean {
  return ator.papel === "admin";
}

export type AlvoDeGestao = { id: string; papel: Papel; ehMaster: boolean };

// O master, dono do sistema, nunca é alterado: sem ele o projeto perde quem o
// administra. A própria conta também não, para ninguém se trancar do lado de
// fora pela tela. O banco repete a trava do master.
export function podeAlterarUsuario(ator: Ator, alvo: AlvoDeGestao): boolean {
  return ator.papel === "admin" && !alvo.ehMaster && alvo.id !== ator.profileId;
}

export const PAPEIS_ATRIBUIVEIS: Papel[] = [
  "professor",
  "student",
  "it_support",
  "admin",
];
