export type Papel = "student" | "professor" | "it_support" | "admin";

export type Conta = {
  email: string;
  nome: string;
  papel: Papel;
  professor?: string;
  curso?: string;
  turma?: string;
  termosAceitos: boolean;
  master?: boolean;
};

export type Espaco = {
  predio: number;
  andar: string;
  sala: number;
  capacidade: number;
  tipo: "classroom" | "laboratory" | "auditorium";
  recursos: string[];
};

export type Atribuicao = {
  professor: string;
  disciplina: string;
  turma: string;
  dia: number;
  turno: keyof typeof TURNOS;
  espaco: string;
  titulo?: string;
  registradaPor?: string;
};

export type Reserva = {
  espaco: string;
  professor: string;
  turma: string;
  disciplina: string | null;
  tipo: "class" | "exam" | "event";
  titulo: string;
  inicio: string;
  fim: string;
  recursos: string[];
  registradaPor: string;
  cancelada: { motivo: string; em: string } | null;
};

export type Palestra = {
  titulo: string;
  palestrante: string;
  espaco: string;
  inicio: string;
  fim: string;
  vagas: number;
  cursos: string[];
};

export type Chamado = {
  espaco: string;
  solicitante: string;
  descricao: string;
  prioridade: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved" | "cancelled";
  atribuidoA?: string;
  criadoHa: number;
  iniciadoHa?: number;
  resolvidoHa?: number;
  canceladoHa?: number;
  nota?: string;
};

export type Bloqueio = {
  de: string;
  ate: string;
  espaco: string | null;
  motivo: string;
};

export const CURSOS = [
  { nome: "Sistemas de Informação", departamento: "Ciências Exatas" },
  { nome: "Engenharia Civil", departamento: "Ciências Exatas" },
  { nome: "Enfermagem", departamento: "Ciências da Saúde" },
  { nome: "Psicologia", departamento: "Ciências da Saúde" },
  { nome: "Administração", departamento: "Ciências Sociais Aplicadas" },
  { nome: "Direito", departamento: "Ciências Jurídicas" },
];

export const PROFESSORES = [
  { nome: "Ana Beatriz Moura", email: "ana.moura@exemplo.edu.br" },
  { nome: "Carlos Eduardo Lima", email: "carlos.lima@exemplo.edu.br" },
  { nome: "Marina Alves Prado", email: "marina.prado@exemplo.edu.br" },
  { nome: "Roberto Figueiredo", email: "roberto.figueiredo@exemplo.edu.br" },
  { nome: "Juliana Castro", email: "juliana.castro@exemplo.edu.br" },
  { nome: "Fernando Azevedo", email: "fernando.azevedo@exemplo.edu.br" },
  { nome: "Patrícia Nogueira", email: "marina.prado@exemplo.edu.br" },
  { nome: "Eduardo Martins", email: "coordenacao@exemplo.edu.br" },
  { nome: "Camila Ribeiro", email: "roberto.figueiredo@exemplo.edu.br" },
  { nome: "Lucas Barreto", email: "fernando.azevedo@exemplo.edu.br" },
  { nome: "Helena Duarte", email: "juliana.castro@exemplo.edu.br" },
  { nome: "Ricardo Tavares", email: "ricardo.tavares@exemplo.edu.br" },
];

export const RECURSOS = [
  "Projetor",
  "Lousa digital",
  "Computadores",
  "Ar-condicionado",
  "Sistema de som",
  "Microfone sem fio",
  "Videoconferência",
  "Quadro branco",
  "Simuladores de enfermagem",
];

export const TURMAS = [
  { nome: "SI 2º semestre A", curso: "Sistemas de Informação", alunos: 48 },
  { nome: "SI 4º semestre B", curso: "Sistemas de Informação", alunos: 55 },
  { nome: "SI 6º semestre A", curso: "Sistemas de Informação", alunos: 36 },
  { nome: "SI 8º semestre A", curso: "Sistemas de Informação", alunos: 42 },
  { nome: "ENG 2º semestre A", curso: "Engenharia Civil", alunos: 38 },
  { nome: "ENG 6º semestre A", curso: "Engenharia Civil", alunos: 34 },
  { nome: "ENG 8º semestre A", curso: "Engenharia Civil", alunos: 30 },
  { nome: "ENF 2º semestre A", curso: "Enfermagem", alunos: 40 },
  { nome: "ENF 6º semestre A", curso: "Enfermagem", alunos: 30 },
  { nome: "PSI 4º semestre A", curso: "Psicologia", alunos: 34 },
  { nome: "PSI 8º semestre A", curso: "Psicologia", alunos: 32 },
  { nome: "ADM 3º semestre A", curso: "Administração", alunos: 50 },
  { nome: "ADM 7º semestre A", curso: "Administração", alunos: 44 },
  { nome: "DIR 5º semestre A", curso: "Direito", alunos: 60 },
  { nome: "DIR 9º semestre A", curso: "Direito", alunos: 46 },
];

export const DISCIPLINAS = [
  { nome: "Banco de Dados II", curso: "Sistemas de Informação" },
  { nome: "Engenharia de Software", curso: "Sistemas de Informação" },
  { nome: "Algoritmos e Estruturas de Dados", curso: "Sistemas de Informação" },
  { nome: "Redes de Computadores", curso: "Sistemas de Informação" },
  { nome: "Inteligência Artificial", curso: "Sistemas de Informação" },
  { nome: "Programação Web", curso: "Sistemas de Informação" },
  { nome: "Sistemas Operacionais", curso: "Sistemas de Informação" },
  { nome: "Gestão de Projetos de TI", curso: "Sistemas de Informação" },
  { nome: "Resistência dos Materiais", curso: "Engenharia Civil" },
  { nome: "Cálculo II", curso: "Engenharia Civil" },
  { nome: "Estruturas de Concreto", curso: "Engenharia Civil" },
  { nome: "Topografia", curso: "Engenharia Civil" },
  { nome: "Hidráulica", curso: "Engenharia Civil" },
  { nome: "Saúde Coletiva", curso: "Enfermagem" },
  { nome: "Anatomia Humana", curso: "Enfermagem" },
  { nome: "Fundamentos de Enfermagem", curso: "Enfermagem" },
  { nome: "Farmacologia", curso: "Enfermagem" },
  { nome: "Psicologia do Desenvolvimento", curso: "Psicologia" },
  { nome: "Neurociência do Comportamento", curso: "Psicologia" },
  { nome: "Psicopatologia", curso: "Psicologia" },
  { nome: "Contabilidade Geral", curso: "Administração" },
  { nome: "Marketing Estratégico", curso: "Administração" },
  { nome: "Gestão de Pessoas", curso: "Administração" },
  { nome: "Direito Constitucional", curso: "Direito" },
  { nome: "Direito Civil I", curso: "Direito" },
  { nome: "Direito Penal", curso: "Direito" },
];

export const ESPACOS: Espaco[] = [
  { predio: 1, andar: "T", sala: 1, capacidade: 45, tipo: "classroom", recursos: ["Projetor", "Ar-condicionado", "Quadro branco"] },
  { predio: 1, andar: "T", sala: 2, capacidade: 30, tipo: "classroom", recursos: ["Lousa digital", "Ar-condicionado"] },
  { predio: 1, andar: "T", sala: 3, capacidade: 50, tipo: "classroom", recursos: ["Projetor", "Ar-condicionado"] },
  { predio: 1, andar: "T", sala: 4, capacidade: 35, tipo: "classroom", recursos: ["Projetor", "Quadro branco"] },
  { predio: 1, andar: "1", sala: 5, capacidade: 40, tipo: "classroom", recursos: ["Projetor", "Ar-condicionado"] },
  { predio: 1, andar: "1", sala: 6, capacidade: 60, tipo: "classroom", recursos: ["Projetor", "Ar-condicionado", "Sistema de som"] },
  { predio: 2, andar: "1", sala: 4, capacidade: 40, tipo: "laboratory", recursos: ["Projetor", "Computadores", "Ar-condicionado"] },
  { predio: 2, andar: "1", sala: 5, capacidade: 40, tipo: "laboratory", recursos: ["Projetor", "Computadores", "Ar-condicionado"] },
  { predio: 2, andar: "T", sala: 1, capacidade: 30, tipo: "laboratory", recursos: ["Simuladores de enfermagem", "Projetor", "Ar-condicionado"] },
  { predio: 2, andar: "T", sala: 2, capacidade: 40, tipo: "laboratory", recursos: ["Simuladores de enfermagem", "Quadro branco"] },
  { predio: 3, andar: "T", sala: 10, capacidade: 70, tipo: "classroom", recursos: ["Projetor", "Ar-condicionado"] },
  { predio: 3, andar: "T", sala: 11, capacidade: 80, tipo: "classroom", recursos: ["Projetor", "Ar-condicionado", "Sistema de som"] },
  { predio: 3, andar: "T", sala: 12, capacidade: 120, tipo: "auditorium", recursos: ["Projetor", "Sistema de som", "Ar-condicionado", "Microfone sem fio", "Videoconferência"] },
  { predio: 4, andar: "T", sala: 1, capacidade: 200, tipo: "auditorium", recursos: ["Projetor", "Sistema de som", "Ar-condicionado", "Microfone sem fio", "Videoconferência"] },
  { predio: 4, andar: "S", sala: 2, capacidade: 40, tipo: "classroom", recursos: ["Projetor"] },
];

export function codigoDoEspaco(e: Pick<Espaco, "predio" | "andar" | "sala">) {
  return `${e.predio}${e.andar}-${String(e.sala).padStart(2, "0")}`;
}

export const PERIODOS = [
  { codigo: "2026.1", de: "2026-02-02", ate: "2026-06-27" },
  { codigo: "2026.2", de: "2026-08-03", ate: "2026-12-19" },
  { codigo: "2027.1", de: "2027-02-01", ate: "2027-06-26" },
];

export const BLOQUEIOS: Bloqueio[] = [
  { de: "2026-04-03", ate: "2026-04-03", espaco: null, motivo: "Sexta-feira Santa" },
  { de: "2026-04-21", ate: "2026-04-21", espaco: null, motivo: "Tiradentes" },
  { de: "2026-05-01", ate: "2026-05-01", espaco: null, motivo: "Dia do Trabalho" },
  { de: "2026-06-04", ate: "2026-06-04", espaco: null, motivo: "Corpus Christi" },
  { de: "2026-09-07", ate: "2026-09-07", espaco: null, motivo: "Independência do Brasil" },
  { de: "2026-09-21", ate: "2026-09-22", espaco: "3T-12", motivo: "Dedetização do auditório" },
  { de: "2026-10-12", ate: "2026-10-12", espaco: null, motivo: "Nossa Senhora Aparecida" },
  { de: "2026-10-15", ate: "2026-10-15", espaco: null, motivo: "Dia do Professor, sem aulas" },
  { de: "2026-11-02", ate: "2026-11-02", espaco: null, motivo: "Finados" },
  { de: "2026-11-16", ate: "2026-11-18", espaco: "2T-01", motivo: "Manutenção dos simuladores" },
  { de: "2026-11-20", ate: "2026-11-20", espaco: null, motivo: "Consciência Negra" },
  { de: "2026-12-07", ate: "2026-12-08", espaco: "1T-02", motivo: "Troca do piso" },
  { de: "2026-12-25", ate: "2026-12-25", espaco: null, motivo: "Natal" },
];

export const TURNOS = {
  M1: ["07:30", "09:10"],
  M2: ["09:20", "11:00"],
  T1: ["13:30", "15:10"],
  T2: ["15:20", "17:00"],
  N1: ["19:00", "20:40"],
  N2: ["20:50", "22:30"],
} as const;

const REGISTRADOR = "adm@umc.br";

export const ATRIBUICOES: Atribuicao[] = [
  { professor: "Ana Beatriz Moura", disciplina: "Engenharia de Software", turma: "SI 8º semestre A", dia: 0, turno: "N1", espaco: "1T-01" },
  { professor: "Ana Beatriz Moura", disciplina: "Banco de Dados II", turma: "SI 8º semestre A", dia: 2, turno: "N1", espaco: "1T-01" },
  { professor: "Carlos Eduardo Lima", disciplina: "Resistência dos Materiais", turma: "ENG 2º semestre A", dia: 0, turno: "N1", espaco: "21-04", titulo: "Laboratório de Materiais", registradaPor: REGISTRADOR },
  { professor: "Carlos Eduardo Lima", disciplina: "Banco de Dados II", turma: "SI 4º semestre B", dia: 1, turno: "N1", espaco: "11-06" },
  { professor: "Marina Alves Prado", disciplina: "Saúde Coletiva", turma: "ENF 6º semestre A", dia: 3, turno: "N1", espaco: "1T-02" },
  { professor: "Roberto Figueiredo", disciplina: "Algoritmos e Estruturas de Dados", turma: "SI 2º semestre A", dia: 0, turno: "M1", espaco: "11-06" },
  { professor: "Roberto Figueiredo", disciplina: "Sistemas Operacionais", turma: "SI 6º semestre A", dia: 1, turno: "T1", espaco: "21-05" },
  { professor: "Roberto Figueiredo", disciplina: "Redes de Computadores", turma: "SI 4º semestre B", dia: 3, turno: "M2", espaco: "11-06" },
  { professor: "Juliana Castro", disciplina: "Inteligência Artificial", turma: "SI 8º semestre A", dia: 4, turno: "N1", espaco: "1T-01" },
  { professor: "Juliana Castro", disciplina: "Programação Web", turma: "SI 6º semestre A", dia: 2, turno: "T1", espaco: "21-05" },
  { professor: "Fernando Azevedo", disciplina: "Cálculo II", turma: "ENG 2º semestre A", dia: 1, turno: "M1", espaco: "1T-03" },
  { professor: "Fernando Azevedo", disciplina: "Estruturas de Concreto", turma: "ENG 6º semestre A", dia: 3, turno: "N1", espaco: "1T-04" },
  { professor: "Fernando Azevedo", disciplina: "Topografia", turma: "ENG 8º semestre A", dia: 2, turno: "M2", espaco: "1T-02" },
  { professor: "Patrícia Nogueira", disciplina: "Anatomia Humana", turma: "ENF 2º semestre A", dia: 0, turno: "M1", espaco: "2T-02" },
  { professor: "Patrícia Nogueira", disciplina: "Fundamentos de Enfermagem", turma: "ENF 6º semestre A", dia: 2, turno: "N1", espaco: "2T-01" },
  { professor: "Patrícia Nogueira", disciplina: "Farmacologia", turma: "ENF 2º semestre A", dia: 4, turno: "M1", espaco: "2T-02" },
  { professor: "Eduardo Martins", disciplina: "Contabilidade Geral", turma: "ADM 3º semestre A", dia: 1, turno: "N1", espaco: "1T-03" },
  { professor: "Eduardo Martins", disciplina: "Marketing Estratégico", turma: "ADM 7º semestre A", dia: 3, turno: "N1", espaco: "3T-10" },
  { professor: "Eduardo Martins", disciplina: "Gestão de Pessoas", turma: "ADM 3º semestre A", dia: 4, turno: "N1", espaco: "1T-03" },
  { professor: "Camila Ribeiro", disciplina: "Direito Constitucional", turma: "DIR 5º semestre A", dia: 0, turno: "N1", espaco: "3T-11" },
  { professor: "Camila Ribeiro", disciplina: "Direito Civil I", turma: "DIR 9º semestre A", dia: 2, turno: "N1", espaco: "3T-10" },
  { professor: "Lucas Barreto", disciplina: "Direito Penal", turma: "DIR 5º semestre A", dia: 1, turno: "N1", espaco: "3T-11" },
  { professor: "Helena Duarte", disciplina: "Psicologia do Desenvolvimento", turma: "PSI 4º semestre A", dia: 0, turno: "N1", espaco: "1T-04" },
  { professor: "Helena Duarte", disciplina: "Neurociência do Comportamento", turma: "PSI 8º semestre A", dia: 2, turno: "N1", espaco: "1T-04" },
  { professor: "Helena Duarte", disciplina: "Psicopatologia", turma: "PSI 4º semestre A", dia: 3, turno: "N1", espaco: "11-05" },
  { professor: "Ricardo Tavares", disciplina: "Gestão de Projetos de TI", turma: "SI 8º semestre A", dia: 3, turno: "N1", espaco: "1T-01" },
  { professor: "Ricardo Tavares", disciplina: "Hidráulica", turma: "ENG 6º semestre A", dia: 1, turno: "N1", espaco: "1T-04" },
];

const CANCELAMENTOS: { professor: string; disciplina: string; data: string; motivo: string }[] = [
  { professor: "Lucas Barreto", disciplina: "Direito Penal", data: "2026-09-22", motivo: "Professor em congresso" },
  { professor: "Fernando Azevedo", disciplina: "Cálculo II", data: "2026-10-20", motivo: "Falta de energia no prédio 1" },
  { professor: "Eduardo Martins", disciplina: "Marketing Estratégico", data: "2026-10-08", motivo: "Reunião de colegiado" },
  { professor: "Ricardo Tavares", disciplina: "Hidráulica", data: "2026-11-10", motivo: "Aula remarcada para sábado" },
  { professor: "Patrícia Nogueira", disciplina: "Farmacologia", data: "2026-11-13", motivo: "Professora em capacitação" },
  { professor: "Roberto Figueiredo", disciplina: "Algoritmos e Estruturas de Dados", data: "2026-11-09", motivo: "Atividade institucional" },
];

const PROVAS: { professor: string; disciplina: string; data: string; inicio: string; fim: string }[] = [
  { professor: "Fernando Azevedo", disciplina: "Cálculo II", data: "2026-09-26", inicio: "08:00", fim: "10:00" },
  { professor: "Ana Beatriz Moura", disciplina: "Banco de Dados II", data: "2026-09-26", inicio: "08:00", fim: "10:00" },
  { professor: "Patrícia Nogueira", disciplina: "Anatomia Humana", data: "2026-09-26", inicio: "08:00", fim: "10:00" },
  { professor: "Eduardo Martins", disciplina: "Contabilidade Geral", data: "2026-09-26", inicio: "10:30", fim: "12:30" },
  { professor: "Helena Duarte", disciplina: "Psicologia do Desenvolvimento", data: "2026-10-31", inicio: "08:00", fim: "10:00" },
  { professor: "Camila Ribeiro", disciplina: "Direito Civil I", data: "2026-10-31", inicio: "08:00", fim: "10:00" },
  { professor: "Roberto Figueiredo", disciplina: "Algoritmos e Estruturas de Dados", data: "2026-10-31", inicio: "10:30", fim: "12:30" },
  { professor: "Ana Beatriz Moura", disciplina: "Engenharia de Software", data: "2026-11-21", inicio: "08:00", fim: "10:00" },
  { professor: "Carlos Eduardo Lima", disciplina: "Resistência dos Materiais", data: "2026-11-21", inicio: "08:00", fim: "10:00" },
  { professor: "Marina Alves Prado", disciplina: "Saúde Coletiva", data: "2026-11-21", inicio: "08:00", fim: "10:00" },
  { professor: "Camila Ribeiro", disciplina: "Direito Constitucional", data: "2026-11-21", inicio: "10:30", fim: "12:30" },
  { professor: "Juliana Castro", disciplina: "Inteligência Artificial", data: "2026-11-28", inicio: "08:00", fim: "10:00" },
  { professor: "Roberto Figueiredo", disciplina: "Redes de Computadores", data: "2026-11-28", inicio: "08:00", fim: "10:00" },
  { professor: "Helena Duarte", disciplina: "Neurociência do Comportamento", data: "2026-11-28", inicio: "10:30", fim: "12:30" },
  { professor: "Eduardo Martins", disciplina: "Marketing Estratégico", data: "2026-11-28", inicio: "08:00", fim: "10:00" },
  { professor: "Fernando Azevedo", disciplina: "Estruturas de Concreto", data: "2026-12-05", inicio: "08:00", fim: "10:00" },
];

const EVENTOS: {
  titulo: string;
  professor: string;
  turma: string;
  espaco: string;
  data: string;
  inicio: string;
  fim: string;
  recursos: string[];
}[] = [
  { titulo: "Oficina de Git e GitHub", professor: "Juliana Castro", turma: "SI 6º semestre A", espaco: "21-05", data: "2026-09-12", inicio: "09:00", fim: "12:00", recursos: ["Computadores", "Projetor"] },
  { titulo: "Feira de Profissões", professor: "Eduardo Martins", turma: "ADM 7º semestre A", espaco: "4T-01", data: "2026-10-24", inicio: "09:00", fim: "13:00", recursos: ["Projetor", "Sistema de som"] },
  { titulo: "Workshop de Carreira em TI", professor: "Roberto Figueiredo", turma: "SI 8º semestre A", espaco: "3T-12", data: "2026-11-07", inicio: "14:00", fim: "17:00", recursos: ["Projetor", "Microfone sem fio"] },
  { titulo: "Simulado do ENADE", professor: "Ricardo Tavares", turma: "SI 8º semestre A", espaco: "3T-11", data: "2026-11-12", inicio: "14:00", fim: "17:00", recursos: ["Projetor"] },
  { titulo: "Mutirão de Saúde", professor: "Patrícia Nogueira", turma: "ENF 6º semestre A", espaco: "4T-01", data: "2026-11-14", inicio: "08:00", fim: "12:00", recursos: ["Sistema de som"] },
  { titulo: "Reunião de colegiado", professor: "Ana Beatriz Moura", turma: "SI 8º semestre A", espaco: "1T-03", data: "2026-11-19", inicio: "16:00", fim: "17:30", recursos: ["Projetor"] },
  { titulo: "Mostra de Projetos Integradores", professor: "Ricardo Tavares", turma: "ENG 8º semestre A", espaco: "4T-01", data: "2026-12-05", inicio: "09:00", fim: "13:00", recursos: ["Projetor", "Sistema de som"] },
  { titulo: "Apresentação de TCC de Sistemas de Informação", professor: "Ana Beatriz Moura", turma: "SI 8º semestre A", espaco: "3T-10", data: "2026-12-10", inicio: "14:00", fim: "18:00", recursos: ["Projetor"] },
  { titulo: "Confraternização de fim de semestre", professor: "Eduardo Martins", turma: "ADM 3º semestre A", espaco: "4T-01", data: "2026-12-12", inicio: "19:00", fim: "22:00", recursos: ["Sistema de som", "Microfone sem fio"] },
];

export function montarContas(emailDemo: string): Conta[] {
  const aluno = (nome: string, email: string, turma: string): Conta => ({
    email: email.includes("@") ? email : `${email}@exemplo.edu.br`,
    nome,
    papel: "student",
    turma,
    curso: TURMAS.find((t) => t.nome === turma)?.curso,
    termosAceitos: true,
  });

  const professor = (nome: string, email: string, aceitou = true): Conta => ({
    email: email.includes("@") ? email : `${email}@exemplo.edu.br`,
    nome,
    papel: "professor",
    professor: nome,
    termosAceitos: aceitou,
  });

  return [
    {
      email: emailDemo,
      nome: "Ana Beatriz Moura",
      papel: "professor",
      professor: "Ana Beatriz Moura",
      termosAceitos: false,
    },
    { ...professor("Marina Alves Prado", "marina.prado", false) },
    professor("Carlos Eduardo Lima", "professor@umc.br"),
    professor("Roberto Figueiredo", "roberto.figueiredo"),
    professor("Juliana Castro", "juliana.castro"),
    professor("Fernando Azevedo", "fernando.azevedo"),

    {
      email: "coordenacao@exemplo.edu.br",
      nome: "Coordenação Acadêmica",
      papel: "admin",
      termosAceitos: false,
    },
    {
      email: REGISTRADOR,
      nome: "Administrador",
      papel: "admin",
      termosAceitos: true,
      master: true,
    },

    {
      email: "suporte@umc.br",
      nome: "Diego Ferreira",
      papel: "it_support",
      termosAceitos: true,
    },
    {
      email: "aline.barbosa@exemplo.edu.br",
      nome: "Aline Barbosa",
      papel: "it_support",
      termosAceitos: true,
    },

    aluno("Gabriel Santos", "aluno@umc.br", "SI 8º semestre A"),
    aluno("Beatriz Oliveira", "beatriz.oliveira", "SI 8º semestre A"),
    aluno("Rafaela Nunes", "rafaela.nunes", "SI 6º semestre A"),
    aluno("Lucas Pereira", "lucas.pereira", "SI 4º semestre B"),
    aluno("Pedro Henrique Costa", "pedro.costa", "ENG 8º semestre A"),
    aluno("Isabela Ferraz", "isabela.ferraz", "ENG 6º semestre A"),
    aluno("Matheus Gomes", "matheus.gomes", "ENG 2º semestre A"),
    aluno("Larissa Mendes", "larissa.mendes", "ENF 2º semestre A"),
    aluno("Vitória Campos", "vitoria.campos", "ENF 6º semestre A"),
    aluno("Amanda Lopes", "amanda.lopes", "PSI 4º semestre A"),
    aluno("Gustavo Rezende", "gustavo.rezende", "PSI 8º semestre A"),
    aluno("Thiago Almeida", "thiago.almeida", "ADM 3º semestre A"),
    aluno("Bianca Moreira", "bianca.moreira", "ADM 7º semestre A"),
    aluno("Mariana Rocha", "mariana.rocha", "DIR 5º semestre A"),
    aluno("Felipe Araújo", "felipe.araujo", "DIR 9º semestre A"),
  ];
}

export const EMAIL_DO_ADMIN = REGISTRADOR;
export const EMAIL_DO_TI = "suporte@umc.br";
export const EMAIL_DO_TI_2 = "aline.barbosa@exemplo.edu.br";

function dataParaUtc(dia: string): Date {
  return new Date(`${dia}T00:00:00Z`);
}

export function somarDias(dia: string, dias: number): string {
  const data = dataParaUtc(dia);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

function diaDaSemana(dia: string): number {
  return (dataParaUtc(dia).getUTCDay() + 6) % 7;
}

function instante(dia: string, hora: string): string {
  return `${dia}T${hora}:00-03:00`;
}

function chaveDoDia(data: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(data);
  return partes;
}

function bloqueado(dia: string, espaco: string): boolean {
  return BLOQUEIOS.some(
    (b) =>
      dia >= b.de && dia <= b.ate && (b.espaco === null || b.espaco === espaco)
  );
}

function recursosDeAula(espaco: string): string[] {
  const permitidos = [
    "Projetor",
    "Computadores",
    "Lousa digital",
    "Simuladores de enfermagem",
    "Quadro branco",
  ];
  const sala = ESPACOS.find((e) => codigoDoEspaco(e) === espaco);
  return (sala?.recursos ?? []).filter((r) => permitidos.includes(r));
}

function quemRegistra(professor: string, contas: Conta[]): string {
  return (
    contas.find((c) => c.papel === "professor" && c.professor === professor)
      ?.email ?? REGISTRADOR
  );
}

export function montarReservas(contas: Conta[]): Reserva[] {
  const periodo = PERIODOS.find((p) => p.codigo === "2026.2")!;
  const reservas: Reserva[] = [];
  const usados = new Set<string>();

  const primeiraSegunda = periodo.de;

  for (const a of ATRIBUICOES) {
    const [inicio, fim] = TURNOS[a.turno];

    for (
      let dia = somarDias(primeiraSegunda, a.dia);
      dia <= periodo.ate;
      dia = somarDias(dia, 7)
    ) {
      if (bloqueado(dia, a.espaco)) continue;

      const cancelamento = CANCELAMENTOS.find(
        (c) =>
          c.professor === a.professor &&
          c.disciplina === a.disciplina &&
          c.data === dia
      );
      if (cancelamento) usados.add(cancelamento.data + cancelamento.disciplina);

      reservas.push({
        espaco: a.espaco,
        professor: a.professor,
        turma: a.turma,
        disciplina: a.disciplina,
        tipo: "class",
        titulo: a.titulo ?? `Aula de ${a.disciplina}`,
        inicio: instante(dia, inicio),
        fim: instante(dia, fim),
        recursos: recursosDeAula(a.espaco),
        registradaPor: a.registradaPor ?? quemRegistra(a.professor, contas),
        cancelada: cancelamento
          ? {
              motivo: cancelamento.motivo,
              em: instante(somarDias(dia, -1), "10:00"),
            }
          : null,
      });
    }
  }

  for (const c of CANCELAMENTOS) {
    if (!usados.has(c.data + c.disciplina)) {
      throw new Error(`Cancelamento sem aula correspondente: ${c.disciplina} ${c.data}`);
    }
  }

  for (const p of PROVAS) {
    const a = ATRIBUICOES.find(
      (x) => x.professor === p.professor && x.disciplina === p.disciplina
    );
    if (!a) throw new Error(`Prova sem atribuição: ${p.disciplina}`);

    reservas.push({
      espaco: a.espaco,
      professor: a.professor,
      turma: a.turma,
      disciplina: a.disciplina,
      tipo: "exam",
      titulo: `Prova de ${a.disciplina}`,
      inicio: instante(p.data, p.inicio),
      fim: instante(p.data, p.fim),
      recursos: [],
      registradaPor: quemRegistra(a.professor, contas),
      cancelada: null,
    });
  }

  for (const e of EVENTOS) {
    reservas.push({
      espaco: e.espaco,
      professor: e.professor,
      turma: e.turma,
      disciplina: null,
      tipo: "event",
      titulo: e.titulo,
      inicio: instante(e.data, e.inicio),
      fim: instante(e.data, e.fim),
      recursos: e.recursos,
      registradaPor: quemRegistra(e.professor, contas),
      cancelada: null,
    });
  }

  return reservas.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export function montarPalestras(hoje: Date): Palestra[] {
  const hojeChave = chaveDoDia(hoje);
  const diaDaSemanaDeHoje = diaDaSemana(hojeChave);
  const proximaSegunda = somarDias(hojeChave, 7 - diaDaSemanaDeHoje);

  const noite = (data: string) => ({
    inicio: instante(data, "19:00"),
    fim: instante(data, "21:00"),
  });

  return [
    {
      titulo: "Carreiras em dados e inteligência artificial",
      palestrante: "Dr. Marcelo Vasconcelos",
      espaco: "3T-12",
      ...noite("2026-08-26"),
      vagas: 100,
      cursos: ["Sistemas de Informação", "Engenharia Civil"],
    },
    {
      titulo: "Boas práticas de segurança do paciente",
      palestrante: "Dra. Renata Carvalho",
      espaco: "3T-12",
      ...noite("2026-09-16"),
      vagas: 90,
      cursos: ["Enfermagem", "Psicologia"],
    },
    {
      titulo: "Direito digital e proteção de dados",
      palestrante: "Dra. Fernanda Lacerda",
      espaco: "4T-01",
      ...noite("2026-10-07"),
      vagas: 150,
      cursos: ["Direito", "Sistemas de Informação", "Administração"],
    },
    {
      titulo: "Empreendedorismo e inovação",
      palestrante: "Gustavo Pimentel",
      espaco: "4T-01",
      ...noite("2026-10-21"),
      vagas: 160,
      cursos: ["Administração", "Engenharia Civil", "Sistemas de Informação"],
    },
    {
      titulo: "Inteligência artificial aplicada à engenharia",
      palestrante: "Dra. Helena Souza",
      espaco: "3T-12",
      inicio: instante(somarDias(proximaSegunda, 2), "09:00"),
      fim: instante(somarDias(proximaSegunda, 2), "11:00"),
      vagas: 80,
      cursos: ["Sistemas de Informação", "Engenharia Civil"],
    },
    {
      titulo: "Saúde mental na vida universitária",
      palestrante: "Dr. André Moreira",
      espaco: "3T-12",
      ...noite("2026-11-11"),
      vagas: 100,
      cursos: ["Psicologia", "Enfermagem"],
    },
    {
      titulo: "Sustentabilidade na construção civil",
      palestrante: "Eng. Paula Siqueira",
      espaco: "4T-01",
      ...noite("2026-11-18"),
      vagas: 180,
      cursos: ["Engenharia Civil", "Administração"],
    },
    {
      titulo: "Mercado jurídico e carreira na advocacia",
      palestrante: "Dr. Sérgio Bastos",
      espaco: "4T-01",
      ...noite("2026-11-25"),
      vagas: 150,
      cursos: ["Direito"],
    },
    {
      titulo: "Cibersegurança na prática",
      palestrante: "Camila Torres",
      espaco: "3T-12",
      ...noite("2026-12-02"),
      vagas: 120,
      cursos: ["Sistemas de Informação"],
    },
    {
      titulo: "Liderança e gestão de equipes",
      palestrante: "Roberta Salles",
      espaco: "4T-01",
      ...noite("2026-12-09"),
      vagas: 170,
      cursos: ["Administração", "Direito"],
    },
  ];
}

export const CHAMADOS: Chamado[] = [
  { espaco: "1T-01", solicitante: "professor@umc.br", descricao: "Projetor não liga ao conectar o notebook.", prioridade: "high", status: "open", criadoHa: 3 },
  { espaco: "1T-03", solicitante: "coordenacao@exemplo.edu.br", descricao: "Lousa digital não responde ao toque.", prioridade: "high", status: "open", criadoHa: 9 },
  { espaco: "2T-02", solicitante: "coordenacao@exemplo.edu.br", descricao: "Simulador de ressuscitação sem bateria.", prioridade: "medium", status: "open", criadoHa: 30 },
  { espaco: "4T-01", solicitante: "adm@umc.br", descricao: "Ar-condicionado fazendo ruído alto durante a palestra.", prioridade: "low", status: "open", criadoHa: 52 },
  { espaco: "21-04", solicitante: "coordenacao@exemplo.edu.br", descricao: "Três computadores sem acesso à internet.", prioridade: "medium", status: "in_progress", atribuidoA: EMAIL_DO_TI, criadoHa: 26, iniciadoHa: 20 },
  { espaco: "11-06", solicitante: "roberto.figueiredo@exemplo.edu.br", descricao: "Caixa de som com falha no canal direito.", prioridade: "medium", status: "in_progress", atribuidoA: EMAIL_DO_TI_2, criadoHa: 44, iniciadoHa: 30 },
  { espaco: "1T-04", solicitante: "fernando.azevedo@exemplo.edu.br", descricao: "Projetor desalinhando a imagem após alguns minutos.", prioridade: "low", status: "in_progress", atribuidoA: EMAIL_DO_TI, criadoHa: 70, iniciadoHa: 46 },
  { espaco: "3T-12", solicitante: "professor@umc.br", descricao: "Microfone sem fio com chiado.", prioridade: "low", status: "resolved", atribuidoA: EMAIL_DO_TI, criadoHa: 72, iniciadoHa: 70, resolvidoHa: 68, nota: "Pilhas trocadas e canal de frequência ajustado." },
  { espaco: "21-05", solicitante: "juliana.castro@exemplo.edu.br", descricao: "Teclados de quatro máquinas com teclas falhando.", prioridade: "medium", status: "resolved", atribuidoA: EMAIL_DO_TI_2, criadoHa: 120, iniciadoHa: 110, resolvidoHa: 96, nota: "Teclados substituídos pelo estoque do laboratório." },
  { espaco: "1T-02", solicitante: "marina.prado@exemplo.edu.br", descricao: "Lousa digital sem calibração, caneta errando o ponto.", prioridade: "low", status: "resolved", atribuidoA: EMAIL_DO_TI, criadoHa: 200, iniciadoHa: 190, resolvidoHa: 188, nota: "Calibração refeita e driver atualizado." },
  { espaco: "2T-01", solicitante: "marina.prado@exemplo.edu.br", descricao: "Manequim de simulação com sensor de pulso inoperante.", prioridade: "high", status: "resolved", atribuidoA: EMAIL_DO_TI_2, criadoHa: 340, iniciadoHa: 330, resolvidoHa: 300, nota: "Sensor substituído pelo fornecedor." },
  { espaco: "3T-10", solicitante: "roberto.figueiredo@exemplo.edu.br", descricao: "Tomadas da fileira dos fundos sem energia.", prioridade: "medium", status: "resolved", atribuidoA: EMAIL_DO_TI, criadoHa: 410, iniciadoHa: 400, resolvidoHa: 380, nota: "Disjuntor religado e circuito revisado pela manutenção." },
  { espaco: "11-05", solicitante: "juliana.castro@exemplo.edu.br", descricao: "Cabo HDMI do projetor danificado.", prioridade: "low", status: "cancelled", criadoHa: 150, canceladoHa: 148 },
  { espaco: "3T-11", solicitante: "fernando.azevedo@exemplo.edu.br", descricao: "Sistema de som sem áudio.", prioridade: "medium", status: "cancelled", criadoHa: 260, canceladoHa: 255 },
];

export function verificar(reservas: Reserva[], palestras: Palestra[]) {
  const turmas = new Map(TURMAS.map((t) => [t.nome, t]));
  const espacos = new Map(ESPACOS.map((e) => [codigoDoEspaco(e), e]));
  const professores = new Set(PROFESSORES.map((p) => p.nome));

  type Faixa = { de: number; ate: number; rotulo: string };
  const porChave = new Map<string, Faixa[]>();

  function ocupar(chave: string, faixa: Faixa) {
    const existentes = porChave.get(chave) ?? [];
    const choque = existentes.find((f) => f.de < faixa.ate && faixa.de < f.ate);
    if (choque) {
      throw new Error(`Conflito em ${chave}: "${choque.rotulo}" x "${faixa.rotulo}"`);
    }
    porChave.set(chave, [...existentes, faixa]);
  }

  for (const r of reservas) {
    const sala = espacos.get(r.espaco);
    const turma = turmas.get(r.turma);
    if (!sala) throw new Error(`Espaço inexistente: ${r.espaco}`);
    if (!turma) throw new Error(`Turma inexistente: ${r.turma}`);
    if (!professores.has(r.professor)) throw new Error(`Professor inexistente: ${r.professor}`);
    if (turma.alunos > sala.capacidade) {
      throw new Error(`${r.titulo}: ${turma.alunos} alunos não cabem em ${r.espaco} (${sala.capacidade})`);
    }
    for (const recurso of r.recursos) {
      if (!sala.recursos.includes(recurso)) {
        throw new Error(`${r.titulo}: ${r.espaco} não tem ${recurso}`);
      }
    }

    if (r.cancelada) continue;

    const faixa = { de: Date.parse(r.inicio), ate: Date.parse(r.fim), rotulo: `${r.titulo} ${r.inicio}` };
    ocupar(`espaço ${r.espaco}`, faixa);
    ocupar(`professor ${r.professor}`, faixa);
    ocupar(`turma ${r.turma}`, faixa);

    const dia = r.inicio.slice(0, 10);
    if (bloqueado(dia, r.espaco)) {
      throw new Error(`${r.titulo} cai num bloqueio do calendário: ${dia} ${r.espaco}`);
    }
  }

  for (const p of palestras) {
    const sala = espacos.get(p.espaco);
    if (!sala) throw new Error(`Espaço inexistente: ${p.espaco}`);
    if (p.vagas > sala.capacidade) {
      throw new Error(`${p.titulo}: ${p.vagas} vagas excedem ${p.espaco}`);
    }
    ocupar(`espaço ${p.espaco}`, {
      de: Date.parse(p.inicio),
      ate: Date.parse(p.fim),
      rotulo: `${p.titulo} ${p.inicio}`,
    });
    if (bloqueado(p.inicio.slice(0, 10), p.espaco)) {
      throw new Error(`${p.titulo} cai num bloqueio do calendário`);
    }
  }
}
