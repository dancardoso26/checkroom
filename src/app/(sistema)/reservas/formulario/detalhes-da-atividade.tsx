"use client";

import { SelecaoComPesquisa } from "@/components/selecao-com-pesquisa";
import { SeletorDeData } from "@/components/seletor-de-data";
import { SeletorDeHora } from "@/components/seletor-de-hora";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ULTIMO_INICIO } from "@/domain/booking/businessHours";
import type { ActivityType } from "@/domain/booking/types";
import { cn } from "@/lib/utils";

import type { AnaliseResult } from "./analise";
import {
  ehPeriodoValido,
  ROTULO_DA_ATIVIDADE,
  type CamposDaReserva,
} from "./campos";
import {
  CamposDaPalestraNoPainel,
  EspacoEVagasDaPalestra,
} from "./campos-da-palestra";
import { LinhaDoFormulario } from "./linha-do-formulario";
import type { Catalogos } from "./painel-de-reserva";
import { ResultadoDaAgenda } from "./resultado-da-agenda";
import { SeletorDeRecursos } from "./seletor-de-recursos";
import { Aviso } from "./aviso";
import type { CamposDaPalestra } from "./use-formulario-de-reserva";

const TIPOS = Object.entries(ROTULO_DA_ATIVIDADE) as [ActivityType, string][];

export function DetalhesDaAtividade({
  campos,
  alterar,
  catalogos,
  professorFixo,
  hoje,
  recursos,
  alternarRecurso,
  analise,
  analisando,
  atividadeCompleta,
  permitePalestra,
  somentePalestra,
  palestra,
  alterarPalestra,
}: {
  campos: CamposDaReserva;
  alterar: (campo: keyof CamposDaReserva, valor: string) => void;
  catalogos: Catalogos;
  professorFixo: string | null;
  hoje: string;
  recursos: string[];
  alternarRecurso: (id: string, marcado: boolean) => void;
  analise: AnaliseResult | null;
  analisando: boolean;
  atividadeCompleta: boolean;
  permitePalestra: boolean;
  somentePalestra: boolean;
  palestra: CamposDaPalestra;
  alterarPalestra: <C extends keyof CamposDaPalestra>(
    campo: C,
    valor: CamposDaPalestra[C]
  ) => void;
}) {
  const tipos = TIPOS.filter(
    ([valor]) => valor !== "lecture" || permitePalestra
  );
  const ehPalestra = campos.activityType === "lecture";
  const { professors, classes, subjects, assignments, resources } = catalogos;
  const ehAula = campos.activityType === "class";

  const turmasPermitidas =
    ehAula && campos.professorId
      ? classes.filter((c) =>
          assignments.some(
            (a) => a.professorId === campos.professorId && a.classId === c.id
          )
        )
      : classes;

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

  const periodoValido = ehPeriodoValido(campos);

  const espacosLivres =
    periodoValido && analise?.status === "ok"
      ? catalogos.rooms.filter(
          (r) => analise.rooms.find((v) => v.roomId === r.id)?.compatible
        )
      : null;

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <Label htmlFor="purposeField" className="sr-only">
          Título da atividade
        </Label>
        <input
          id="purposeField"
          value={campos.purpose}
          onChange={(e) => alterar("purpose", e.target.value)}
          placeholder={ehPalestra ? "Tema da palestra" : "Adicionar título"}
          maxLength={200}
          className="border-input focus:border-primary placeholder:text-muted-foreground w-full border-b-2 bg-transparent pb-1 text-xl outline-none focus-visible:outline-none!"
        />

        {!somentePalestra && (
          <RadioGroup
            aria-label="Tipo de atividade"
            value={campos.activityType}
            onValueChange={(v) => {
              alterar("activityType", v);
              alterar("subjectId", "");
              if (v === "class") alterar("classId", "");
            }}
            className="flex flex-wrap gap-1.5"
          >
            {tipos.map(([valor, rotulo]) => (
              <label
                key={valor}
                htmlFor={`tipo-${valor}`}
                className={cn(
                  "has-focus-visible:ring-ring/50 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors has-focus-visible:ring-[3px]",
                  campos.activityType === valor
                    ? "bg-primary-subtle text-primary"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                <RadioGroupItem
                  id={`tipo-${valor}`}
                  value={valor}
                  className="sr-only"
                />
                {rotulo}
              </label>
            ))}
          </RadioGroup>
        )}
      </div>

      <LinhaDoFormulario rotulo="Data e hora" htmlFor="dateField">
        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem_auto_6.5rem] items-center gap-2">
          <SeletorDeData
            id="dateField"
            value={campos.date}
            onChange={(v) => alterar("date", v)}
            minimo={hoje}
            hoje={hoje}
          />
          <Label htmlFor="startField" className="sr-only">
            Início
          </Label>
          <SeletorDeHora
            id="startField"
            value={campos.startTime}
            onChange={(v) => alterar("startTime", v)}
            maximo={ULTIMO_INICIO}
          />
          <span className="text-muted-foreground text-sm">às</span>
          <Label htmlFor="endField" className="sr-only">
            Término
          </Label>
          <SeletorDeHora
            id="endField"
            value={campos.endTime}
            onChange={(v) => alterar("endTime", v)}
            minimo={campos.startTime || undefined}
          />
        </div>
        {campos.startTime !== "" && campos.endTime !== "" && !periodoValido && (
          <p className="text-destructive text-sm">
            O término precisa ser posterior ao início.
          </p>
        )}
      </LinhaDoFormulario>

      {ehPalestra ? (
        <CamposDaPalestraNoPainel
          palestra={palestra}
          alterarPalestra={alterarPalestra}
          professores={professors.map((p) => ({ id: p.id, name: p.name }))}
          cursos={catalogos.cursos}
        />
      ) : (
        <>
        <LinhaDoFormulario rotulo="Professor"
          htmlFor="professorField"
        >
          {professorFixo ? (
            <div id="professorField" className="flex h-9 items-center text-sm">
              {professors.find((p) => p.id === professorFixo)?.name ??
                "Professor não identificado"}
            </div>
          ) : (
            <SelecaoComPesquisa
              id="professorField"
              value={campos.professorId}
              onChange={(v) => {
                alterar("professorId", v);
                alterar("classId", "");
                alterar("subjectId", "");
              }}
              opcoes={professors.map((p) => ({ id: p.id, nome: p.name }))}
              placeholder="Professor"
              rotuloDaPesquisa="Pesquisar professores"
            />
          )}
        </LinhaDoFormulario>

        <LinhaDoFormulario rotulo="Turma" htmlFor="classField">
          <SelecaoComPesquisa
            id="classField"
            value={campos.classId}
            onChange={(v) => {
              alterar("classId", v);
              alterar("subjectId", "");
            }}
            disabled={ehAula && !campos.professorId}
            opcoes={turmasPermitidas.map((t) => ({
              id: t.id,
              nome: `${t.name} · ${t.courseName}`,
              detalhe: `${t.studentCount} alunos`,
            }))}
            placeholder={
              ehAula && !campos.professorId
                ? "Turma (escolha o professor primeiro)"
                : "Turma"
            }
            rotuloDaPesquisa="Pesquisar turmas"
          />

          {ehAula && campos.professorId && turmasPermitidas.length === 0 && (
            <Aviso tom="erro" titulo="Sem vínculo acadêmico">
              Este professor não leciona para nenhuma turma no período letivo.
              Escolha outro, ou registre como prova ou evento.
            </Aviso>
          )}
        </LinhaDoFormulario>

        {ehAula && (
          <LinhaDoFormulario rotulo="Disciplina" htmlFor="subjectField">
            <SelecaoComPesquisa
              id="subjectField"
              value={campos.subjectId}
              onChange={(v) => alterar("subjectId", v)}
              disabled={!campos.classId || disciplinasPermitidas.length === 0}
              opcoes={disciplinasPermitidas.map((s) => ({ id: s.id, nome: s.name }))}
              placeholder={
                campos.classId ? "Disciplina" : "Disciplina (escolha a turma primeiro)"
              }
              rotuloDaPesquisa="Pesquisar disciplinas"
            />
          </LinhaDoFormulario>
        )}

        </>
      )}

      <LinhaDoFormulario rotulo="Recursos"
        htmlFor="resourcesField"
      >
        <SeletorDeRecursos
          id="resourcesField"
          recursos={resources}
          selecionados={recursos}
          alternar={alternarRecurso}
        />
      </LinhaDoFormulario>

      {ehPalestra && (
        <EspacoEVagasDaPalestra
          palestra={palestra}
          alterarPalestra={alterarPalestra}
          espacosLivres={espacosLivres}
          buscandoEspacos={periodoValido && analisando}
          espacoId={campos.roomId}
          aoEscolherEspaco={(id) => alterar("roomId", id)}
        />
      )}

      {(atividadeCompleta || ehPalestra) && periodoValido && (
        <div className="pl-8">
          <ResultadoDaAgenda
            analise={analise}
            analisando={analisando}
            ehPalestra={ehPalestra}
            espacosDisponiveis={ehPalestra ? (espacosLivres?.length ?? null) : null}
          />
        </div>
      )}
    </div>
  );
}
