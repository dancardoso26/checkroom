"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ClassOption } from "@/lib/repositories/classRepository";
import type { ProfessorOption } from "@/lib/repositories/professorRepository";
import type { SubjectOption } from "@/lib/repositories/subjectRepository";
import { Aviso, Cabecalho } from "./ui";

/**
 * A disciplina é opcional porque nem toda atividade acadêmica é aula: defesa de
 * TCC, seminário e reunião de colegiado ocupam espaço sem pertencer a uma.
 *
 * Quando informada, a regra passa a exigir que o professor a lecione para
 * aquela turma no período letivo. A lista abaixo já é filtrada pelo curso da
 * turma, mas o filtro é conveniência: a verificação do vínculo acontece no
 * servidor e é ela que recusa.
 */
export function EtapaAtividade({
  campos,
  alterar,
  professors,
  classes,
  subjects,
}: {
  campos: {
    professorId: string;
    classId: string;
    subjectId: string;
    purpose: string;
  };
  alterar: (
    campo: "professorId" | "classId" | "subjectId" | "purpose",
    valor: string
  ) => void;
  professors: ProfessorOption[];
  classes: ClassOption[];
  subjects: SubjectOption[];
}) {
  const turma = classes.find((c) => c.id === campos.classId);

  // Sem turma escolhida não há como saber de qual curso são as disciplinas.
  const disciplinasDoCurso = turma
    ? subjects.filter((s) => s.courseId === turma.courseId)
    : [];

  return (
    <>
      <Cabecalho
        titulo="Qual é a atividade?"
        descricao="A turma define a capacidade necessária, e a disciplina determina o vínculo acadêmico exigido."
      />

      <div className="space-y-2">
        <Label htmlFor="purposeField">Finalidade</Label>
        <Input
          id="purposeField"
          value={campos.purpose}
          onChange={(e) => alterar("purpose", e.target.value)}
          placeholder="Aula de Banco de Dados II"
          maxLength={200}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="professorField">Professor responsável</Label>
          <Select
            value={campos.professorId}
            onValueChange={(v) => alterar("professorId", v)}
          >
            <SelectTrigger id="professorField" className="w-full">
              <SelectValue placeholder="Selecione o professor" />
            </SelectTrigger>
            <SelectContent>
              {professors.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="classField">Turma</Label>
          <Select
            value={campos.classId}
            onValueChange={(v) => {
              alterar("classId", v);
              // Trocar de turma pode trocar de curso, e a disciplina anterior
              // deixaria de pertencer a ele. Limpar evita seguir com uma
              // combinação que a lista já não oferece.
              alterar("subjectId", "");
            }}
          >
            <SelectTrigger id="classField" className="w-full">
              <SelectValue placeholder="Selecione a turma" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} · {t.courseName} ({t.studentCount} alunos)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subjectField">Disciplina</Label>
        <Select
          value={campos.subjectId}
          onValueChange={(v) => alterar("subjectId", v)}
          disabled={!turma}
        >
          <SelectTrigger id="subjectField" className="w-full">
            <SelectValue
              placeholder={
                turma ? "Selecione a disciplina" : "Escolha a turma primeiro"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {disciplinasDoCurso.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-muted-foreground text-xs">
          Deixe em branco para atividades que não são aula, como defesa de TCC ou
          seminário.
        </p>
      </div>

      {turma && disciplinasDoCurso.length === 0 && (
        <Aviso tom="neutro" titulo="Nenhuma disciplina cadastrada">
          O curso {turma.courseName} ainda não tem disciplinas no sistema.
        </Aviso>
      )}
    </>
  );
}
