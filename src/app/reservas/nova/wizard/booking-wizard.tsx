"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { criarReserva, type BookingFormState } from "../../actions";
import { analisarReserva, type AnaliseResult } from "../analise";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

import type { RoomOption } from "@/lib/repositories/roomRepository";
import type { ClassOption } from "@/lib/repositories/classRepository";
import type { ProfessorOption } from "@/lib/repositories/professorRepository";
import type { ResourceOption } from "@/lib/repositories/resourceRepository";
import type {
  SubjectOption,
  TeachingAssignmentOption,
} from "@/lib/repositories/subjectRepository";

import { CAMPOS_VAZIOS, ehPeriodoValido, type CamposDaReserva } from "./campos";
import { ETAPAS, Stepper } from "./stepper";
import { EtapaAtividade } from "./etapa-atividade";
import { EtapaHorario } from "./etapa-horario";
import { EtapaNecessidades } from "./etapa-necessidades";
import { EtapaEspaco } from "./etapa-espaco";
import { EtapaConfirmacao } from "./etapa-confirmacao";
import { Resumo } from "./resumo";
import { Confirmada } from "./reserva-confirmada";

type BookingWizardProps = {
  rooms: RoomOption[];
  professors: ProfessorOption[];
  classes: ClassOption[];
  resources: ResourceOption[];
  subjects: SubjectOption[];
  assignments: TeachingAssignmentOption[];
  hoje: string;
};

const ESTADO_INICIAL: BookingFormState = { status: "idle" };

export function BookingWizard({
  rooms,
  professors,
  classes,
  resources,
  subjects,
  assignments,
  hoje,
}: BookingWizardProps) {
  const [etapa, setEtapa] = useState(0);

  const [campos, setCampos] = useState<CamposDaReserva>(() =>
    CAMPOS_VAZIOS(hoje)
  );

  const [recursos, setRecursos] = useState<string[]>([]);

  const [analise, setAnalise] = useState<AnaliseResult | null>(null);
  const [analisando, iniciarAnalise] = useTransition();

  const [state, formAction, enviando] = useActionState(
    criarReserva,
    ESTADO_INICIAL
  );

  function alterar(campo: keyof CamposDaReserva, valor: string) {
    setCampos((atuais) => ({ ...atuais, [campo]: valor }));
  }

  const professor = professors.find((p) => p.id === campos.professorId);
  const turma = classes.find((c) => c.id === campos.classId);

  const periodoPreenchido =
    campos.date !== "" && campos.startTime !== "" && campos.endTime !== "";

  const dadosParaAnalise =
    campos.professorId !== "" && campos.classId !== "" && periodoPreenchido;

  useEffect(() => {
    if (!dadosParaAnalise) return;

    // Descarta a resposta de uma análise que ficou obsoleta enquanto viajava:
    // uma consulta lenta poderia chegar depois de outra mais recente.
    let atual = true;

    iniciarAnalise(async () => {
      const resultado = await analisarReserva({
        professorId: campos.professorId,
        classId: campos.classId,
        date: campos.date,
        startTime: campos.startTime,
        endTime: campos.endTime,
        activityType: campos.activityType,
        subjectId: campos.subjectId,
        resourceIds: recursos,
      });

      if (atual) setAnalise(resultado);
    });

    return () => {
      atual = false;
    };
  }, [
    dadosParaAnalise,
    campos.professorId,
    campos.classId,
    campos.subjectId,
    campos.activityType,
    campos.date,
    campos.startTime,
    campos.endTime,
    recursos,
  ]);

  const analiseAtual = dadosParaAnalise ? analise : null;

  const roomIdValido =
    campos.roomId !== "" &&
    analiseAtual?.status === "ok" &&
    analiseAtual.rooms.find((r) => r.roomId === campos.roomId)?.compatible
      ? campos.roomId
      : "";

  const espaco = rooms.find((r) => r.id === roomIdValido);

  function alternarRecurso(id: string, marcado: boolean) {
    setRecursos((atuais) =>
      marcado ? [...atuais, id] : atuais.filter((r) => r !== id)
    );
  }

  const agendaLivre =
    !analisando &&
    analiseAtual?.status === "ok" &&
    analiseAtual.scheduleMessages.length === 0;

  const podeAvancar = [
    campos.professorId !== "" &&
      campos.classId !== "" &&
      campos.purpose.trim() !== "" &&
      (campos.activityType !== "class" || campos.subjectId !== ""),
    periodoPreenchido && ehPeriodoValido(campos) && agendaLivre,
    true,
    roomIdValido !== "" && !analisando,
    true,
  ][etapa];

  /** Usada pelo botão da última etapa; o motivo está na declaração dele. */
  const formulario = useRef<HTMLFormElement>(null);

  const motivosDaRecusa =
    state.status === "error"
      ? [...state.messages, ...Object.values(state.fieldErrors).flat()]
      : [];

  // Envio manual em vez de <form action>: o action do React 19 limpa o
  // formulário ao responder, zerando os campos quando a reserva é recusada.
  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => formAction(dados));
  }

  if (state.status === "success") {
    return <Confirmada bookingId={state.bookingId} />;
  }

  return (
    <div className="space-y-6">
      <Stepper etapaAtual={etapa} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <form ref={formulario} onSubmit={enviar} className="space-y-6">
          {state.status === "error" && motivosDaRecusa.length > 0 && (
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

          <Card>
            <CardContent className="space-y-5">
              {etapa === 0 && (
                <EtapaAtividade
                  campos={campos}
                  alterar={alterar}
                  professors={professors}
                  classes={classes}
                  subjects={subjects}
                  assignments={assignments}
                />
              )}

              {etapa === 1 && (
                <EtapaHorario
                  campos={campos}
                  alterar={alterar}
                  hoje={hoje}
                  analise={analiseAtual}
                  analisando={analisando}
                />
              )}

              {etapa === 2 && (
                <EtapaNecessidades
                  resources={resources}
                  selecionados={recursos}
                  alternar={alternarRecurso}
                  turma={turma}
                />
              )}

              {etapa === 3 && (
                <EtapaEspaco
                  rooms={rooms}
                  resources={resources}
                  analise={analiseAtual}
                  analisando={analisando}
                  selecionado={roomIdValido}
                  onSelect={(id) => alterar("roomId", id)}
                />
              )}

              {etapa === 4 && (
                <EtapaConfirmacao
                  campos={campos}
                  professor={professor}
                  turma={turma}
                  espaco={espaco}
                  recursos={recursos}
                  resources={resources}
                  disciplina={subjects.find((s) => s.id === campos.subjectId)}
                />
              )}
            </CardContent>
          </Card>

          {/* Ficam fora das etapas: dentro delas, os valores das etapas não
              visíveis não seriam enviados. */}
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

          <div className="flex flex-wrap items-center justify-between gap-3">
            {etapa === 0 ? (
              <Button type="button" variant="ghost" asChild>
                <Link href="/reservas">Cancelar</Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEtapa((e) => e - 1)}
              >
                <ArrowLeft />
                Voltar
              </Button>
            )}

            {/* Os dois botões precisam de key distinta: reaproveitando o mesmo
                nó, o React trocava o type durante o clique e criava a reserva. */}
            {etapa < ETAPAS.length - 1 ? (
              <Button
                key="avancar"
                type="button"
                disabled={!podeAvancar}
                onClick={() => setEtapa((e) => e + 1)}
              >
                {etapa === 1 && analisando ? "Verificando..." : "Continuar"}
                <ArrowRight />
              </Button>
            ) : (
              <Button
                key="confirmar"
                type="button"
                disabled={enviando}
                // requestSubmit passa pelas validações do navegador; submit() puro
                // as ignoraria.
                onClick={() => formulario.current?.requestSubmit()}
              >
                {enviando ? "Confirmando..." : "Confirmar reserva"}
              </Button>
            )}
          </div>
        </form>

        <Resumo
          professor={professor}
          turma={turma}
          espaco={espaco}
          campos={campos}
          recursos={recursos}
          resources={resources}
          disciplina={subjects.find((s) => s.id === campos.subjectId)}
        />
      </div>
    </div>
  );
}
