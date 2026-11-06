"use client";

import { Plus, Trash2 } from "lucide-react";

import { RotuloDeCampo } from "@/components/rotulo-de-campo";
import { SelecaoComPesquisa } from "@/components/selecao-com-pesquisa";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Curso, Disciplina, Turma } from "@/domain/academico/academico";

export type LinhaDeVinculo = {
  chave: string;
  cursoId: string;
  disciplinaId: string;
  turmaId: string;
};

export type OpcoesDeDocencia = {
  cursos: Curso[];
  disciplinas: Disciplina[];
  turmas: Turma[];
  periodo: string;
};

export function novaLinha(): LinhaDeVinculo {
  return {
    chave: crypto.randomUUID(),
    cursoId: "",
    disciplinaId: "",
    turmaId: "",
  };
}

export function VinculosDoProfessor({
  linhas,
  onChange,
  opcoes,
}: {
  linhas: LinhaDeVinculo[];
  onChange: (linhas: LinhaDeVinculo[]) => void;
  opcoes: OpcoesDeDocencia;
}) {
  function atualizar(chave: string, parte: Partial<LinhaDeVinculo>) {
    onChange(linhas.map((l) => (l.chave === chave ? { ...l, ...parte } : l)));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        Disciplinas e turmas{" "}
        <span className="text-muted-foreground font-normal">
          (opcional, período {opcoes.periodo})
        </span>
      </p>

      {linhas.map((linha, indice) => {
        const disciplinas = opcoes.disciplinas.filter(
          (d) => d.cursoId === linha.cursoId
        );
        const turmas = opcoes.turmas.filter((t) => t.cursoId === linha.cursoId);
        const base = `vinculo${indice}`;

        return (
          <div
            key={linha.chave}
            className="space-y-3 rounded-lg border p-3"
            data-vinculo={indice}
          >
            <div className="space-y-2">
              <Label htmlFor={`${base}Curso`}>
                <RotuloDeCampo rotulo="Curso" />
              </Label>
              <SelecaoComPesquisa
                id={`${base}Curso`}
                value={linha.cursoId}
                onChange={(cursoId) =>
                  atualizar(linha.chave, {
                    cursoId,
                    disciplinaId: "",
                    turmaId: "",
                  })
                }
                opcoes={opcoes.cursos}
                placeholder="Selecione o curso"
                rotuloDaPesquisa="Pesquisar cursos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${base}Disciplina`}>
                <RotuloDeCampo rotulo="Disciplina" />
              </Label>
              <SelecaoComPesquisa
                id={`${base}Disciplina`}
                value={linha.disciplinaId}
                onChange={(disciplinaId) =>
                  atualizar(linha.chave, { disciplinaId })
                }
                opcoes={disciplinas}
                disabled={linha.cursoId === ""}
                placeholder={
                  linha.cursoId === ""
                    ? "Escolha o curso primeiro"
                    : "Selecione a disciplina"
                }
                rotuloDaPesquisa="Pesquisar disciplinas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${base}Turma`}>
                <RotuloDeCampo rotulo="Turma" />
              </Label>
              <SelecaoComPesquisa
                id={`${base}Turma`}
                value={linha.turmaId}
                onChange={(turmaId) => atualizar(linha.chave, { turmaId })}
                opcoes={turmas}
                disabled={linha.cursoId === ""}
                placeholder={
                  linha.cursoId === ""
                    ? "Escolha o curso primeiro"
                    : "Selecione a turma"
                }
                rotuloDaPesquisa="Pesquisar turmas"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange(linhas.filter((l) => l.chave !== linha.chave))
              }
            >
              <Trash2 />
              Remover
            </Button>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...linhas, novaLinha()])}
      >
        <Plus />
        Adicionar disciplina e turma
      </Button>
    </div>
  );
}
