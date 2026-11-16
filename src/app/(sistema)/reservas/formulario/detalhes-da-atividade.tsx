"use client";

import { SelecaoComPesquisa } from "@/components/selecao-com-pesquisa";
import { SeletorDeData } from "@/components/seletor-de-data";
import { SeletorDeHora } from "@/components/seletor-de-hora";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ULTIMO_INICIO } from "@/domain/reservas/expediente";
import type { TipoDeAtividade } from "@/domain/reservas/tipos";
import { cn } from "@/lib/utils";

import type { ResultadoDaAnalise } from "./analise";
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

const TIPOS = Object.entries(ROTULO_DA_ATIVIDADE) as [
  TipoDeAtividade,
  string,
][];

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
  analise: ResultadoDaAnalise | null;
  analisando: boolean;
  atividadeCompleta: boolean;
  permitePalestra: boolean;
  somentePalestra: boolean;
  palestra: CamposDaPalestra;
  alterarPalestra: <C extends keyof CamposDaPalestra>(
    campo: C,
    valor: CamposDaPalestra[C],
  ) => void;
}) {
  const tipos = TIPOS.filter(
    ([valor]) => valor !== "lecture" || permitePalestra,
  );
  const ehPalestra = campos.tipoDeAtividade === "lecture";
  const {
    professores,
    turmas,
    disciplinas,
    vinculos,
    recursos: opcoesDeRecursos,
  } = catalogos;
  const ehAula = campos.tipoDeAtividade === "class";

  const turmasPermitidas =
    (ehAula || professorFixo) && campos.professorId
      ? turmas.filter((c) =>
          vinculos.some(
            (a) => a.professorId === campos.professorId && a.turmaId === c.id,
          ),
        )
      : turmas;

  const disciplinasPermitidas =
    campos.professorId && campos.turmaId
      ? disciplinas.filter((s) =>
          vinculos.some(
            (a) =>
              a.professorId === campos.professorId &&
              a.turmaId === campos.turmaId &&
              a.disciplinaId === s.id,
          ),
        )
      : [];

  const periodoValido = ehPeriodoValido(campos);

  const espacosLivres =
    periodoValido && analise?.status === "ok"
      ? catalogos.espacos.filter(
          (r) => analise.espacos.find((v) => v.espacoId === r.id)?.compativel,
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
          value={campos.finalidade}
          onChange={(e) => alterar("finalidade", e.target.value)}
          placeholder={ehPalestra ? "Tema da palestra" : "Adicionar título"}
          maxLength={200}
          className="border-input focus:border-primary placeholder:text-muted-foreground w-full border-b-2 bg-transparent pb-1 text-xl outline-none focus-visible:outline-none!"
        />

        {!somentePalestra && (
          <RadioGroup
            aria-label="Tipo de atividade"
            value={campos.tipoDeAtividade}
            onValueChange={(v) => {
              alterar("tipoDeAtividade", v);
              alterar("disciplinaId", "");
              if (v === "class") alterar("turmaId", "");
            }}
            className="flex flex-wrap gap-1.5"
          >
            {tipos.map(([valor, rotulo]) => (
              <label
                key={valor}
                htmlFor={`tipo-${valor}`}
                className={cn(
                  "has-focus-visible:ring-ring/50 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors has-focus-visible:ring-[3px]",
                  campos.tipoDeAtividade === valor
                    ? "bg-primary-subtle text-primary"
                    : "text-muted-foreground hover:bg-accent",
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
            value={campos.data}
            onChange={(v) => alterar("data", v)}
            minimo={hoje}
            hoje={hoje}
          />
          <Label htmlFor="startField" className="sr-only">
            Início
          </Label>
          <SeletorDeHora
            id="startField"
            value={campos.horaDeInicio}
            onChange={(v) => alterar("horaDeInicio", v)}
            maximo={ULTIMO_INICIO}
          />
          <span className="text-muted-foreground text-sm">às</span>
          <Label htmlFor="endField" className="sr-only">
            Término
          </Label>
          <SeletorDeHora
            id="endField"
            value={campos.horaDeTermino}
            onChange={(v) => alterar("horaDeTermino", v)}
            minimo={campos.horaDeInicio || undefined}
          />
        </div>
        {campos.horaDeInicio !== "" &&
          campos.horaDeTermino !== "" &&
          !periodoValido && (
            <p className="text-destructive text-sm">
              O término precisa ser posterior ao início.
            </p>
          )}
      </LinhaDoFormulario>

      {ehPalestra ? (
        <CamposDaPalestraNoPainel
          palestra={palestra}
          alterarPalestra={alterarPalestra}
          professores={professores.map((p) => ({ id: p.id, nome: p.nome }))}
          cursos={catalogos.cursos}
        />
      ) : (
        <>
          <LinhaDoFormulario rotulo="Professor" htmlFor="professorField">
            {professorFixo ? (
              <div
                id="professorField"
                className="flex h-9 items-center text-sm"
              >
                {professores.find((p) => p.id === professorFixo)?.nome ??
                  "Professor não identificado"}
              </div>
            ) : (
              <SelecaoComPesquisa
                id="professorField"
                value={campos.professorId}
                onChange={(v) => {
                  alterar("professorId", v);
                  alterar("turmaId", "");
                  alterar("disciplinaId", "");
                }}
                opcoes={professores.map((p) => ({ id: p.id, nome: p.nome }))}
                placeholder="Professor"
                rotuloDaPesquisa="Pesquisar professores"
              />
            )}
          </LinhaDoFormulario>

          <LinhaDoFormulario rotulo="Turma" htmlFor="classField">
            <SelecaoComPesquisa
              id="classField"
              value={campos.turmaId}
              onChange={(v) => {
                alterar("turmaId", v);
                alterar("disciplinaId", "");
              }}
              disabled={ehAula && !campos.professorId}
              opcoes={turmasPermitidas.map((t) => ({
                id: t.id,
                nome: `${t.nome} · ${t.nomeDoCurso}`,
                detalhe: `${t.quantidadeDeAlunos} alunos`,
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
                value={campos.disciplinaId}
                onChange={(v) => alterar("disciplinaId", v)}
                disabled={!campos.turmaId || disciplinasPermitidas.length === 0}
                opcoes={disciplinasPermitidas.map((s) => ({
                  id: s.id,
                  nome: s.nome,
                }))}
                placeholder={
                  campos.turmaId
                    ? "Disciplina"
                    : "Disciplina (escolha a turma primeiro)"
                }
                rotuloDaPesquisa="Pesquisar disciplinas"
              />
            </LinhaDoFormulario>
          )}
        </>
      )}

      <LinhaDoFormulario rotulo="Recursos" htmlFor="resourcesField">
        <SeletorDeRecursos
          id="resourcesField"
          recursos={opcoesDeRecursos}
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
          espacoId={campos.espacoId}
          aoEscolherEspaco={(id) => alterar("espacoId", id)}
        />
      )}

      {(atividadeCompleta || ehPalestra) && periodoValido && (
        <div className="pl-8">
          <ResultadoDaAgenda
            analise={analise}
            analisando={analisando}
            ehPalestra={ehPalestra}
            espacosDisponiveis={
              ehPalestra ? (espacosLivres?.length ?? null) : null
            }
          />
        </div>
      )}
    </div>
  );
}
