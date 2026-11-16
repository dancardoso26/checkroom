"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  combinarDataEHora,
  formatarDataPorExtenso,
  formatarIntervaloDeHoras,
} from "@/lib/datas";

import type { OpcaoDeEspaco } from "@/lib/repositories/repositorio-de-espacos";
import type { OpcaoDeTurma } from "@/lib/repositories/repositorio-de-turmas";
import type { ProfessorParaSelecao } from "@/lib/repositories/repositorio-de-professores";
import type { OpcaoDeRecurso } from "@/lib/repositories/repositorio-de-recursos";
import type { CursoOpcao } from "@/lib/repositories/repositorio-de-cursos";
import type {
  OpcaoDeDisciplina,
  OpcaoDeVinculo,
} from "@/lib/repositories/repositorio-de-disciplinas";

import type { Rascunho } from "../agenda/calendario-grade";
import { ehPeriodoValido, ROTULO_DA_ATIVIDADE } from "./campos";
import { DetalhesDaAtividade } from "./detalhes-da-atividade";
import { SeletorDeEspaco } from "./seletor-de-espaco";
import {
  useFormularioDeReserva,
  type Preenchimento,
} from "./use-formulario-de-reserva";

export type Catalogos = {
  espacos: OpcaoDeEspaco[];
  professores: ProfessorParaSelecao[];
  turmas: OpcaoDeTurma[];
  recursos: OpcaoDeRecurso[];
  disciplinas: OpcaoDeDisciplina[];
  vinculos: OpcaoDeVinculo[];
  cursos: CursoOpcao[];
};

export function PainelDeReserva({
  catalogos,
  hoje,
  professorFixo,
  preenchimento,
  onFechar,
  onConcluir,
  onRascunho,
  permitePalestra,
  somentePalestra = false,
}: {
  catalogos: Catalogos;
  hoje: string;
  professorFixo: string | null;
  preenchimento: Preenchimento;
  onFechar: () => void;
  onConcluir: (reservaId: string | null, dia: string) => void;
  onRascunho: (rascunho: Rascunho | null) => void;
  permitePalestra: boolean;
  somentePalestra?: boolean;
}) {
  const {
    campos,
    alterar,
    palestra,
    alterarPalestra,
    ehPalestra,
    recursos,
    alternarRecurso,
    analise,
    analisando,
    espacoIdValido,
    atividadeCompleta,
    prontoParaEspacos,
    prontoParaConfirmar,
    conclusao,
    enviando,
    enviar,
    formulario,
    motivosDaRecusa,
  } = useFormularioDeReserva({
    hoje,
    professorFixo,
    preenchimento,
    espacos: catalogos.espacos,
  });

  const [etapa, setEtapa] = useState<"detalhes" | "espaco">("detalhes");

  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    if (etapa === "detalhes" && !ehPalestra) {
      evento.preventDefault();
      if (prontoParaEspacos) setEtapa("espaco");
      return;
    }

    if (!prontoParaConfirmar || enviando) {
      evento.preventDefault();
      return;
    }

    enviar(evento);
  }

  useEffect(() => {
    if (!conclusao) return;
    toast.success(
      conclusao.reservaId ? "Reserva confirmada." : "Palestra cadastrada.",
    );
    onConcluir(conclusao.reservaId, campos.data);
  }, [conclusao, campos.data, onConcluir]);

  const periodoValido = ehPeriodoValido(campos);

  useEffect(() => {
    onRascunho(
      periodoValido
        ? {
            dia: campos.data,
            inicio: campos.horaDeInicio,
            fim: campos.horaDeTermino,
            titulo: campos.finalidade,
            tipo: campos.tipoDeAtividade,
          }
        : null,
    );
  }, [
    periodoValido,
    campos.data,
    campos.horaDeInicio,
    campos.horaDeTermino,
    campos.finalidade,
    campos.tipoDeAtividade,
    onRascunho,
  ]);

  const turma = catalogos.turmas.find((c) => c.id === campos.turmaId);
  const espaco = catalogos.espacos.find((r) => r.id === espacoIdValido);

  const periodo = periodoValido
    ? `${formatarDataPorExtenso(combinarDataEHora(campos.data, campos.horaDeInicio))}, ${formatarIntervaloDeHoras(
        combinarDataEHora(campos.data, campos.horaDeInicio),
        combinarDataEHora(campos.data, campos.horaDeTermino),
      )}`
    : null;

  return (
    <Sheet open onOpenChange={(aberto) => !aberto && onFechar()}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-lg"
        overlayClassName="bg-black/10"
        onOpenAutoFocus={(evento) => {
          evento.preventDefault();
          document.getElementById("purposeField")?.focus();
        }}
      >
        <SheetHeader className="px-6 pt-5 pb-2">
          <SheetTitle className="text-muted-foreground text-sm font-medium">
            {ehPalestra ? "Nova palestra" : "Nova reserva"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Etapa {etapa === "detalhes" ? "1" : "2"} de 2
          </SheetDescription>
        </SheetHeader>

        <form
          id="formularioDaReserva"
          ref={formulario}
          onSubmit={aoEnviar}
          className="flex-1 overflow-x-hidden overflow-y-auto px-6 py-4"
        >
          {etapa === "detalhes" || ehPalestra ? (
            <DetalhesDaAtividade
              campos={campos}
              alterar={alterar}
              catalogos={catalogos}
              professorFixo={professorFixo}
              hoje={hoje}
              recursos={recursos}
              alternarRecurso={alternarRecurso}
              analise={analise}
              analisando={analisando}
              atividadeCompleta={atividadeCompleta}
              permitePalestra={permitePalestra}
              somentePalestra={somentePalestra}
              palestra={palestra}
              alterarPalestra={alterarPalestra}
            />
          ) : (
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => setEtapa("detalhes")}
                className="text-muted-foreground hover:text-foreground -ml-1 inline-flex items-center gap-1 rounded px-1 text-sm"
              >
                <ArrowLeft aria-hidden className="size-4" />
                Editar detalhes
              </button>

              <div className="space-y-1">
                <h2 className="text-xl">{campos.finalidade}</h2>
                <p className="text-muted-foreground text-sm first-letter:uppercase">
                  {ROTULO_DA_ATIVIDADE[campos.tipoDeAtividade]} · {periodo}
                </p>
                {ehPalestra ? (
                  <p className="text-muted-foreground text-sm">
                    {palestra.palestrante}, {palestra.vagas} vagas
                  </p>
                ) : (
                  turma && (
                    <p className="text-muted-foreground text-sm">
                      {turma.nome}, {turma.quantidadeDeAlunos} alunos
                    </p>
                  )
                )}
              </div>

              {motivosDaRecusa.length > 0 && (
                <Alert variant="destructive" role="alert">
                  <AlertTitle>
                    {ehPalestra
                      ? "Não foi possível cadastrar a palestra"
                      : "Não foi possível criar a reserva"}
                  </AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc space-y-1 pl-4">
                      {motivosDaRecusa.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {analisando || analise?.status !== "ok" ? (
                <p className="text-muted-foreground text-sm">
                  Analisando espaços...
                </p>
              ) : (
                <SeletorDeEspaco
                  espacos={catalogos.espacos}
                  recursos={catalogos.recursos}
                  veredictos={analise.espacos}
                  espacoEscolhidoId={espacoIdValido}
                  aoEscolher={(id) => alterar("espacoId", id)}
                />
              )}
            </div>
          )}

          {(ehPalestra || etapa === "espaco") &&
            (ehPalestra ? (
              <>
                <input type="hidden" name="titulo" value={campos.finalidade} />
                <input
                  type="hidden"
                  name="palestrante"
                  value={palestra.palestrante}
                />
                <input type="hidden" name="espacoId" value={espacoIdValido} />
                <input type="hidden" name="data" value={campos.data} />
                <input
                  type="hidden"
                  name="inicio"
                  value={campos.horaDeInicio}
                />
                <input type="hidden" name="fim" value={campos.horaDeTermino} />
                <input type="hidden" name="vagas" value={palestra.vagas} />
                {palestra.cursoIds.map((id) => (
                  <input key={id} type="hidden" name="cursoIds" value={id} />
                ))}
              </>
            ) : (
              <>
                <input type="hidden" name="espacoId" value={espacoIdValido} />
                <input
                  type="hidden"
                  name="professorId"
                  value={campos.professorId}
                />
                <input type="hidden" name="turmaId" value={campos.turmaId} />
                <input
                  type="hidden"
                  name="disciplinaId"
                  value={campos.disciplinaId}
                />
                <input
                  type="hidden"
                  name="tipoDeAtividade"
                  value={campos.tipoDeAtividade}
                />
                <input
                  type="hidden"
                  name="finalidade"
                  value={campos.finalidade}
                />
                <input type="hidden" name="data" value={campos.data} />
                <input
                  type="hidden"
                  name="horaDeInicio"
                  value={campos.horaDeInicio}
                />
                <input
                  type="hidden"
                  name="horaDeTermino"
                  value={campos.horaDeTermino}
                />
                {recursos.map((id) => (
                  <input key={id} type="hidden" name="recursoIds" value={id} />
                ))}
              </>
            ))}
        </form>

        <SheetFooter className="flex-row items-center justify-end gap-2 border-t px-6 py-4">
          {etapa === "espaco" && espaco && (
            <p className="text-muted-foreground mr-auto truncate text-sm">
              {espaco.nome}
            </p>
          )}

          <Button type="button" variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>

          {etapa === "detalhes" && !ehPalestra ? (
            <Button
              type="submit"
              form="formularioDaReserva"
              disabled={!prontoParaEspacos}
            >
              Ver espaços
            </Button>
          ) : (
            <Button
              type="submit"
              form="formularioDaReserva"
              disabled={!prontoParaConfirmar || enviando}
            >
              {enviando
                ? ehPalestra
                  ? "Cadastrando..."
                  : "Reservando..."
                : ehPalestra
                  ? "Cadastrar palestra"
                  : "Reservar"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
