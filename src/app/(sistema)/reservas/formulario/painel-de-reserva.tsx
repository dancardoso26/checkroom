"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

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
  combineDateTime,
  formatFullDate,
  formatTimeRange,
} from "@/lib/datetime";

import type { RoomOption } from "@/lib/repositories/roomRepository";
import type { ClassOption } from "@/lib/repositories/classRepository";
import type { ProfessorOption } from "@/lib/repositories/professorRepository";
import type { ResourceOption } from "@/lib/repositories/resourceRepository";
import type {
  SubjectOption,
  TeachingAssignmentOption,
} from "@/lib/repositories/subjectRepository";

import type { Rascunho } from "../agenda/calendario-grade";
import { ehPeriodoValido, ROTULO_DA_ATIVIDADE } from "./campos";
import { DetalhesDaAtividade } from "./detalhes-da-atividade";
import { RoomPicker } from "./room-picker";
import {
  useFormularioDeReserva,
  type Preenchimento,
} from "./use-formulario-de-reserva";

export type Catalogos = {
  rooms: RoomOption[];
  professors: ProfessorOption[];
  classes: ClassOption[];
  resources: ResourceOption[];
  subjects: SubjectOption[];
  assignments: TeachingAssignmentOption[];
};

export function PainelDeReserva({
  catalogos,
  hoje,
  professorFixo,
  preenchimento,
  onFechar,
  onConcluir,
  onRascunho,
}: {
  catalogos: Catalogos;
  hoje: string;
  professorFixo: string | null;
  preenchimento: Preenchimento;
  onFechar: () => void;
  onConcluir: (bookingId: string, dia: string) => void;
  /** Avisa a agenda do horário em montagem, para ela desenhá-lo na grade. */
  onRascunho: (rascunho: Rascunho | null) => void;
}) {
  const {
    campos,
    alterar,
    recursos,
    alternarRecurso,
    analise,
    analisando,
    roomIdValido,
    atividadeCompleta,
    prontoParaEspacos,
    prontoParaConfirmar,
    state,
    enviando,
    enviar,
    formulario,
    motivosDaRecusa,
  } = useFormularioDeReserva({ hoje, professorFixo, preenchimento });

  // Duas etapas: o que e quando, e depois onde. Os espaços só fazem sentido
  // com a atividade completa, porque a análise depende dela inteira.
  const [etapa, setEtapa] = useState<"detalhes" | "espaco">("detalhes");

  // O Enter segue a etapa: nos detalhes avança para os espaços, e só na
  // escolha do espaço cria a reserva. Incompleto, não faz nada.
  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    if (etapa === "detalhes") {
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
    if (state.status === "success") onConcluir(state.bookingId, campos.date);
  }, [state, campos.date, onConcluir]);

  const periodoValido = ehPeriodoValido(campos);

  useEffect(() => {
    onRascunho(
      periodoValido
        ? {
            dia: campos.date,
            inicio: campos.startTime,
            fim: campos.endTime,
            titulo: campos.purpose,
          }
        : null
    );
  }, [
    periodoValido,
    campos.date,
    campos.startTime,
    campos.endTime,
    campos.purpose,
    onRascunho,
  ]);

  const turma = catalogos.classes.find((c) => c.id === campos.classId);
  const espaco = catalogos.rooms.find((r) => r.id === roomIdValido);

  const periodo = periodoValido
    ? `${formatFullDate(combineDateTime(campos.date, campos.startTime))}, ${formatTimeRange(
        combineDateTime(campos.date, campos.startTime),
        combineDateTime(campos.date, campos.endTime)
      )}`
    : null;

  return (
    <Sheet open onOpenChange={(aberto) => !aberto && onFechar()}>
      {/* Overlay claro: o horário em montagem continua visível na grade. */}
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-lg"
        overlayClassName="bg-black/10"
        // O título é o primeiro campo, e já abre pronto para digitar.
        onOpenAutoFocus={(evento) => {
          evento.preventDefault();
          document.getElementById("purposeField")?.focus();
        }}
      >
        <SheetHeader className="px-6 pt-5 pb-2">
          <SheetTitle className="text-muted-foreground text-sm font-medium">
            Nova reserva
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
          {etapa === "detalhes" ? (
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
                <h2 className="text-xl">{campos.purpose}</h2>
                <p className="text-muted-foreground text-sm first-letter:uppercase">
                  {ROTULO_DA_ATIVIDADE[campos.activityType]} · {periodo}
                </p>
                {turma && (
                  <p className="text-muted-foreground text-sm">
                    {turma.name}, {turma.studentCount} alunos
                  </p>
                )}
              </div>

              {motivosDaRecusa.length > 0 && (
                <Alert variant="destructive" role="alert">
                  <AlertTitle>Não foi possível criar a reserva</AlertTitle>
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
                <RoomPicker
                  rooms={catalogos.rooms}
                  resources={catalogos.resources}
                  verdicts={analise.rooms}
                  selectedRoomId={roomIdValido}
                  onSelect={(id) => alterar("roomId", id)}
                />
              )}
            </div>
          )}

          {/* Os valores vão escondidos porque os campos visíveis são controlados,
              e alguns não têm input nativo, como o seletor de horário. */}
          <input type="hidden" name="roomId" value={roomIdValido} />
          <input type="hidden" name="professorId" value={campos.professorId} />
          <input type="hidden" name="classId" value={campos.classId} />
          <input type="hidden" name="subjectId" value={campos.subjectId} />
          <input
            type="hidden"
            name="activityType"
            value={campos.activityType}
          />
          <input type="hidden" name="purpose" value={campos.purpose} />
          <input type="hidden" name="date" value={campos.date} />
          <input type="hidden" name="startTime" value={campos.startTime} />
          <input type="hidden" name="endTime" value={campos.endTime} />
          {recursos.map((id) => (
            <input key={id} type="hidden" name="resourceIds" value={id} />
          ))}
        </form>

        <SheetFooter className="flex-row items-center justify-end gap-2 border-t px-6 py-4">
          {etapa === "espaco" && espaco && (
            <p className="text-muted-foreground mr-auto truncate text-sm">
              {espaco.building} · {espaco.name}
            </p>
          )}

          <Button type="button" variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>

          {etapa === "detalhes" ? (
            // Fora do formulário, no rodapé: o atributo form liga o botão a ele,
            // e assim o Enter num campo aciona a mesma coisa que o clique.
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
              {enviando ? "Reservando..." : "Reservar"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
