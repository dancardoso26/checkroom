"use client";

import { useState } from "react";
import { ListFilter } from "lucide-react";

import { RotuloDeCampo } from "@/components/rotulo-de-campo";
import { SelecaoMultipla } from "@/components/selecao-multipla";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ActivityType } from "@/domain/booking/types";
import type { ParDeDocencia } from "@/lib/repositories/repositorio-de-disciplinas";
import {
  contarFiltrosAtivos,
  FILTROS_PADRAO,
  TIPOS_DE_ATIVIDADE,
  type Filtros,
  type StatusDoFiltro,
} from "@/domain/agenda/filtros-da-agenda";

import { ROTULO_DA_ATIVIDADE } from "../formulario/campos";
import { PONTO_DA_ATIVIDADE } from "./estilo";

export type OpcaoDeProfessor = { id: string; nome: string };

function relacionados(
  escolhidos: string[],
  docencia: ParDeDocencia[],
  de: keyof ParDeDocencia,
  para: keyof ParDeDocencia,
): Set<string> | null {
  if (escolhidos.length === 0) return null;

  return new Set(
    docencia
      .filter((par) => escolhidos.includes(par[de]))
      .map((par) => par[para]),
  );
}

export function FiltrosDaAgenda({
  filtros,
  professores,
  turmas,
  espacos,
  docencia,
  onAplicar,
}: {
  filtros: Filtros;
  professores: OpcaoDeProfessor[];
  turmas: OpcaoDeProfessor[];
  espacos: OpcaoDeProfessor[];
  docencia: ParDeDocencia[];
  onAplicar: (filtros: Filtros) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState(filtros);

  const turmasDosProfessores = relacionados(
    rascunho.professores,
    docencia,
    "professorId",
    "classId",
  );
  const professoresDasTurmas = relacionados(
    rascunho.turmas,
    docencia,
    "classId",
    "professorId",
  );
  const turmasOferecidas = turmasDosProfessores
    ? turmas.filter((t) => turmasDosProfessores.has(t.id))
    : turmas;
  const professoresOferecidos = professoresDasTurmas
    ? professores.filter((p) => professoresDasTurmas.has(p.id))
    : professores;
  const ativos = contarFiltrosAtivos(filtros);

  function alternar(abrir: boolean) {
    if (abrir) setRascunho(filtros);
    setAberto(abrir);
  }

  function aplicar(novos: Filtros) {
    onAplicar(novos);
    setAberto(false);
  }

  return (
    <>
      <Button
        variant={ativos > 0 ? "secondary" : "ghost"}
        size="sm"
        onClick={() => alternar(true)}
      >
        <ListFilter />
        Filtros
        {ativos > 0 && (
          <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
            {ativos}
          </span>
        )}
      </Button>

      <Sheet open={aberto} onOpenChange={alternar}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription className="sr-only">
              Filtrar reservas por professor, turma, espaço, atividade e status.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-4">
            {rascunho.minhas !== null && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filtroMinhas"
                  checked={rascunho.minhas}
                  onCheckedChange={(marcado) =>
                    setRascunho({
                      ...rascunho,
                      minhas: marcado === true,
                      professores: marcado === true ? [] : rascunho.professores,
                    })
                  }
                />
                <Label htmlFor="filtroMinhas">Minhas reservas</Label>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="filtroProfessor">
                <RotuloDeCampo rotulo="Professor" />
              </Label>
              <SelecaoMultipla
                id="filtroProfessor"
                name="filtroProfessor"
                valor={rascunho.professores}
                onChange={(ids) => {
                  const turmasDosEscolhidos = relacionados(
                    ids,
                    docencia,
                    "professorId",
                    "classId",
                  );
                  setRascunho({
                    ...rascunho,
                    turmas: turmasDosEscolhidos
                      ? rascunho.turmas.filter((t) =>
                          turmasDosEscolhidos.has(t),
                        )
                      : rascunho.turmas,
                    professores: ids,
                    minhas:
                      rascunho.minhas === null
                        ? null
                        : ids.length > 0
                          ? false
                          : rascunho.minhas,
                  });
                }}
                opcoes={professoresOferecidos}
                placeholder="Todos os professores"
                rotuloDaPesquisa="Pesquisar professores"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filtroTurma">
                <RotuloDeCampo rotulo="Turma" />
              </Label>
              <SelecaoMultipla
                id="filtroTurma"
                name="filtroTurma"
                valor={rascunho.turmas}
                onChange={(ids) => {
                  const professoresDosEscolhidos = relacionados(
                    ids,
                    docencia,
                    "classId",
                    "professorId",
                  );
                  setRascunho({
                    ...rascunho,
                    turmas: ids,
                    professores: professoresDosEscolhidos
                      ? rascunho.professores.filter((p) =>
                          professoresDosEscolhidos.has(p),
                        )
                      : rascunho.professores,
                  });
                }}
                opcoes={turmasOferecidas}
                placeholder="Todas as turmas"
                rotuloDaPesquisa="Pesquisar turmas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filtroEspaco">
                <RotuloDeCampo rotulo="Espaço" />
              </Label>
              <SelecaoMultipla
                id="filtroEspaco"
                name="filtroEspaco"
                iniciais={rascunho.espacos}
                onChange={(ids) => setRascunho({ ...rascunho, espacos: ids })}
                opcoes={espacos}
                placeholder="Todos os espaços"
                rotuloDaPesquisa="Pesquisar espaços"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filtroTipo">
                <RotuloDeCampo rotulo="Atividade" />
              </Label>
              <SelecaoMultipla
                id="filtroTipo"
                name="filtroTipo"
                iniciais={rascunho.tipos}
                onChange={(ids) =>
                  setRascunho({ ...rascunho, tipos: ids as ActivityType[] })
                }
                opcoes={TIPOS_DE_ATIVIDADE.map((t) => ({
                  id: t,
                  nome: ROTULO_DA_ATIVIDADE[t],
                  marcador: PONTO_DA_ATIVIDADE[t],
                }))}
                placeholder="Todas as atividades"
                rotuloDaPesquisa="Pesquisar atividades"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filtroStatus">
                <RotuloDeCampo rotulo="Status" />
              </Label>
              <SelecaoMultipla
                id="filtroStatus"
                name="filtroStatus"
                iniciais={rascunho.status}
                onChange={(ids) =>
                  setRascunho({ ...rascunho, status: ids as StatusDoFiltro[] })
                }
                opcoes={[
                  {
                    id: "agendadas",
                    nome: "Agendadas",
                    marcador: "bg-success",
                  },
                  {
                    id: "concluidas",
                    nome: "Concluídas",
                    marcador: "bg-primary",
                  },
                  {
                    id: "canceladas",
                    nome: "Canceladas",
                    marcador: "bg-muted-foreground",
                  },
                ]}
                placeholder="Todos os status"
                rotuloDaPesquisa="Pesquisar status"
              />
            </div>
          </div>

          <SheetFooter className="flex-row justify-end">
            <Button
              variant="ghost"
              onClick={() =>
                aplicar({
                  ...FILTROS_PADRAO,
                  minhas: filtros.minhas === null ? null : false,
                })
              }
            >
              Limpar
            </Button>
            <Button onClick={() => aplicar(rascunho)}>Aplicar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
