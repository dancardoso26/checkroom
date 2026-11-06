"use client";

import { useState } from "react";

import { RotuloDeCampo } from "@/components/rotulo-de-campo";
import { SelecaoComPesquisa } from "@/components/selecao-com-pesquisa";
import { Label } from "@/components/ui/label";
import type { TurmaOpcao } from "@/lib/repositories/repositorio-de-turmas";

export function CursoETurmaDoAluno({
  idBase,
  turmas,
  turmaId,
  onChange,
}: {
  idBase: string;
  turmas: TurmaOpcao[];
  turmaId: string;
  onChange: (turmaId: string) => void;
}) {
  const [cursoEscolhido, setCursoEscolhido] = useState("");
  const turmaAtual = turmas.find((t) => t.id === turmaId);
  const cursoId = turmaAtual?.cursoId ?? cursoEscolhido;

  const cursos = [
    ...new Map(turmas.map((t) => [t.cursoId, t.detalhe])).entries(),
  ].map(([id, nome]) => ({ id, nome }));
  const turmasDoCurso = turmas.filter((t) => t.cursoId === cursoId);

  function escolherCurso(novo: string) {
    setCursoEscolhido(novo);
    onChange("");
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idBase}Curso`}>
          <RotuloDeCampo rotulo="Curso" />
        </Label>
        <SelecaoComPesquisa
          id={`${idBase}Curso`}
          value={cursoId}
          onChange={escolherCurso}
          opcoes={cursos}
          placeholder="Selecione o curso"
          rotuloDaPesquisa="Pesquisar cursos"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idBase}Turma`}>
          <RotuloDeCampo rotulo="Turma" />
        </Label>
        <SelecaoComPesquisa
          id={`${idBase}Turma`}
          value={turmaId}
          onChange={onChange}
          opcoes={turmasDoCurso}
          disabled={cursoId === ""}
          placeholder={
            cursoId === "" ? "Escolha o curso primeiro" : "Selecione a turma"
          }
          rotuloDaPesquisa="Pesquisar turmas"
        />
      </div>
    </>
  );
}
