"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import { criarReserva, type BookingFormState } from "../actions";
import { analisarReserva, type AnaliseResult } from "./analise";
import { CAMPOS_VAZIOS, ehPeriodoValido, type CamposDaReserva } from "./campos";

const ESTADO_INICIAL: BookingFormState = { status: "idle" };

export type Preenchimento = {
  date?: string;
  startTime?: string;
  endTime?: string;
};

export function useFormularioDeReserva({
  hoje,
  professorFixo,
  preenchimento,
}: {
  hoje: string;
  professorFixo: string | null;
  preenchimento: Preenchimento;
}) {
  // Só entram os valores presentes: um undefined espalhado por cima apagaria
  // a string vazia que o resto do formulário usa para "não preenchido".
  const [campos, setCampos] = useState<CamposDaReserva>(() => ({
    ...CAMPOS_VAZIOS(hoje),
    ...Object.fromEntries(
      Object.entries(preenchimento).filter(([, valor]) => valor !== undefined)
    ),
    professorId: professorFixo ?? "",
  }));

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

  function alternarRecurso(id: string, marcado: boolean) {
    setRecursos((atuais) =>
      marcado ? [...atuais, id] : atuais.filter((r) => r !== id)
    );
  }

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

  // A sala escolhida some da seleção se uma mudança posterior a tornar
  // incompatível, em vez de seguir marcada até ser recusada no envio.
  const roomIdValido =
    campos.roomId !== "" &&
    analiseAtual?.status === "ok" &&
    analiseAtual.rooms.find((r) => r.roomId === campos.roomId)?.compatible
      ? campos.roomId
      : "";

  const atividadeCompleta =
    campos.professorId !== "" &&
    campos.classId !== "" &&
    campos.purpose.trim() !== "" &&
    (campos.activityType !== "class" || campos.subjectId !== "");

  const agendaLivre =
    !analisando &&
    analiseAtual?.status === "ok" &&
    analiseAtual.scheduleMessages.length === 0;

  // A primeira etapa termina quando a atividade está completa e a agenda livre;
  // a segunda, quando há um espaço compatível escolhido.
  const prontoParaEspacos =
    atividadeCompleta && ehPeriodoValido(campos) && agendaLivre;

  const prontoParaConfirmar = prontoParaEspacos && roomIdValido !== "";

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

  return {
    campos,
    alterar,
    recursos,
    alternarRecurso,
    analise: analiseAtual,
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
  };
}
