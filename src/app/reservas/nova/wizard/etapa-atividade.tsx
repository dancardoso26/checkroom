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
import { Cabecalho } from "./ui";

export function EtapaAtividade({
  campos,
  alterar,
  professors,
  classes,
}: {
  campos: { professorId: string; classId: string; purpose: string };
  alterar: (campo: "professorId" | "classId" | "purpose", valor: string) => void;
  professors: ProfessorOption[];
  classes: ClassOption[];
}) {
  return (
    <>
      <Cabecalho
        titulo="Qual é a atividade?"
        descricao="A turma define a capacidade necessária e entra na verificação de conflito de horário."
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
            onValueChange={(v) => alterar("classId", v)}
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
    </>
  );
}

// ---------------------------------------------------------------------------
// Etapa 2
// ---------------------------------------------------------------------------
