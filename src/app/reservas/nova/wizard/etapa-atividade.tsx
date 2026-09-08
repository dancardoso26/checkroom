"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { ActivityType } from "@/domain/booking/types";
import type { ClassOption } from "@/lib/repositories/classRepository";
import type { ProfessorOption } from "@/lib/repositories/professorRepository";
import type {
  SubjectOption,
  TeachingAssignmentOption,
} from "@/lib/repositories/subjectRepository";
import { CAMPO_FINALIDADE, ROTULO_DA_ATIVIDADE } from "./campos";
import { Aviso, Cabecalho } from "./ui";

/**
 * Os tipos de atividade, com o rótulo que aparece na tela.
 *
 * Só a aula pede disciplina. Os demais não pertencem a nenhuma, e exibir o campo
 * para eles seria pedir um dado que não existe.
 */
const TIPOS = Object.entries(ROTULO_DA_ATIVIDADE) as [ActivityType, string][];

export function EtapaAtividade({
  campos,
  alterar,
  professors,
  classes,
  subjects,
  assignments,
}: {
  campos: {
    activityType: ActivityType;
    professorId: string;
    classId: string;
    subjectId: string;
    purpose: string;
  };
  alterar: (
    campo: "activityType" | "professorId" | "classId" | "subjectId" | "purpose",
    valor: string
  ) => void;
  professors: ProfessorOption[];
  classes: ClassOption[];
  subjects: SubjectOption[];
  assignments: TeachingAssignmentOption[];
}) {
  const ehAula = campos.activityType === "class";

  /**
   * As turmas para as quais ESTE professor leciona, quando a atividade é aula.
   *
   * Palestra, prova, defesa e evento não dependem de vínculo, então oferecem
   * todas. Em aula, oferecer uma turma sem vínculo seria oferecer uma escolha
   * que a etapa seguinte recusaria.
   */
  const turmasPermitidas =
    ehAula && campos.professorId
      ? classes.filter((c) =>
          assignments.some(
            (a) => a.professorId === campos.professorId && a.classId === c.id
          )
        )
      : classes;

  /**
   * As disciplinas que ESTE professor leciona para ESTA turma.
   *
   * Antes a lista trazia todas as disciplinas do curso, e a combinação errada só
   * era recusada duas etapas adiante, quando a análise rodava. Filtrar pelo
   * vínculo faz a escolha impossível deixar de existir, que é o mesmo princípio
   * do seletor de horário.
   *
   * A regra no servidor continua verificando: esta lista é conveniência, não
   * garantia, e um envio vindo de fora do formulário é recusado do mesmo jeito.
   */
  const disciplinasPermitidas =
    campos.professorId && campos.classId
      ? subjects.filter((s) =>
          assignments.some(
            (a) =>
              a.professorId === campos.professorId &&
              a.classId === campos.classId &&
              a.subjectId === s.id
          )
        )
      : [];

  const escolheuOsDois = Boolean(campos.professorId && campos.classId);

  return (
    <>
      <Cabecalho
        titulo="Qual é a atividade?"
        descricao="O tipo determina o que mais precisa ser informado. Só a aula exige disciplina."
      />

      <fieldset className="space-y-3">
        <legend className="text-sm leading-none font-medium">
          Tipo de atividade
        </legend>

        <RadioGroup
          value={campos.activityType}
          onValueChange={(v) => {
            alterar("activityType", v);
            // Sair de "aula" descarta a disciplina: os outros tipos não têm uma.
            // Entrar em "aula" descarta a turma, que pode não ter vínculo com o
            // professor escolhido.
            alterar("subjectId", "");
            if (v === "class") alterar("classId", "");
          }}
          className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5"
        >
          {TIPOS.map(([valor, rotulo]) => (
            <label
              key={valor}
              htmlFor={`tipo-${valor}`}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors",
                campos.activityType === valor
                  ? "border-primary bg-primary-subtle"
                  : "bg-card hover:border-primary/30"
              )}
            >
              <RadioGroupItem id={`tipo-${valor}`} value={valor} />
              <span className="text-sm font-medium">{rotulo}</span>
            </label>
          ))}
        </RadioGroup>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="purposeField">
          {CAMPO_FINALIDADE[campos.activityType].rotulo}
        </Label>
        <Input
          id="purposeField"
          value={campos.purpose}
          onChange={(e) => alterar("purpose", e.target.value)}
          placeholder={CAMPO_FINALIDADE[campos.activityType].exemplo}
          maxLength={200}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="professorField">Professor responsável</Label>
          <Select
            value={campos.professorId}
            onValueChange={(v) => {
              alterar("professorId", v);
              // Trocar o professor muda quais turmas e disciplinas são
              // possíveis, e as anteriores podem não estar entre elas.
              alterar("classId", "");
              alterar("subjectId", "");
            }}
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
              alterar("subjectId", "");
            }}
            disabled={ehAula && !campos.professorId}
          >
            <SelectTrigger id="classField" className="w-full">
              <SelectValue
                placeholder={
                  ehAula && !campos.professorId
                    ? "Escolha o professor primeiro"
                    : "Selecione a turma"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {turmasPermitidas.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} · {t.courseName} ({t.studentCount} alunos)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {ehAula && (
        <div className="space-y-2">
          <Label htmlFor="subjectField">Disciplina</Label>
          <Select
            value={campos.subjectId}
            onValueChange={(v) => alterar("subjectId", v)}
            disabled={!escolheuOsDois || disciplinasPermitidas.length === 0}
          >
            <SelectTrigger id="subjectField" className="w-full">
              <SelectValue
                placeholder={
                  escolheuOsDois
                    ? "Selecione a disciplina"
                    : "Escolha o professor e a turma primeiro"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {disciplinasPermitidas.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {ehAula && campos.professorId && turmasPermitidas.length === 0 && (
        <Aviso tom="erro" titulo="Sem vínculo acadêmico">
          {professors.find((p) => p.id === campos.professorId)?.name} não leciona
          para nenhuma turma no período letivo. Escolha outro professor, ou
          registre a atividade como palestra, prova, defesa ou evento.
        </Aviso>
      )}
    </>
  );
}
