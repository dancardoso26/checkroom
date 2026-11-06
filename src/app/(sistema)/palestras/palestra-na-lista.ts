import type { SituacaoParaOAluno } from "@/domain/palestras/palestra";
import type { Status } from "@/domain/status/status";
import type { PalestraItem } from "@/lib/repositories/repositorio-de-palestras";

export type Palestra = PalestraItem & {
  iniciada: boolean;
  situacaoDoAluno: SituacaoParaOAluno | null;
};

const STATUS_DO_ALUNO: Record<SituacaoParaOAluno, Status | null> = {
  inscrito: "inscrito",
  disponivel: "vagas_abertas",
  lotada: "lotada",
  encerrada: "encerrada",
  fora_do_curso: null,
};

export const STATUS_FILTRAVEIS: Status[] = [
  "vagas_abertas",
  "inscrito",
  "lotada",
  "encerrada",
];

export function statusDaPalestra(palestra: Palestra): Status {
  const doAluno = palestra.situacaoDoAluno
    ? STATUS_DO_ALUNO[palestra.situacaoDoAluno]
    : null;
  if (doAluno) return doAluno;
  if (palestra.iniciada) return "encerrada";
  return palestra.inscritos >= palestra.vagas ? "lotada" : "vagas_abertas";
}

export function unicos(valores: string[]) {
  return [...new Set(valores)]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((nome) => ({ id: nome, nome }));
}
