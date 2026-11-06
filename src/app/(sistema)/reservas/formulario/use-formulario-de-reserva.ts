"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import type { ActivityType } from "@/domain/booking/types";
import { ESTADO_INICIAL as PALESTRA_OCIOSA } from "@/lib/formulario";

import { cadastrarPalestra } from "../../palestras/acoes";
import { criarReserva, type BookingFormState } from "../acoes/criar";
import {
  analisarPalestra,
  analisarReserva,
  type AnaliseResult,
} from "./analise";
import { CAMPOS_VAZIOS, ehPeriodoValido, type CamposDaReserva } from "./campos";

const ESTADO_INICIAL: BookingFormState = { status: "idle" };

export type Preenchimento = {
  date?: string;
  startTime?: string;
  endTime?: string;
  activityType?: ActivityType;
};

export type CamposDaPalestra = {
  palestrante: string;
  vagas: string;
  cursoIds: string[];
};

export type Conclusao = { bookingId: string | null };

function vagasValidas(vagas: string): number | null {
  const numero = Number(vagas);
  return vagas.trim() !== "" && Number.isInteger(numero) && numero > 0
    ? numero
    : null;
}

export function useFormularioDeReserva({
  hoje,
  professorFixo,
  preenchimento,
  rooms,
}: {
  rooms: { id: string; capacity: number }[];
  hoje: string;
  professorFixo: string | null;
  preenchimento: Preenchimento;
}) {
  const [campos, setCampos] = useState<CamposDaReserva>(() => ({
    ...CAMPOS_VAZIOS(hoje),
    ...Object.fromEntries(
      Object.entries(preenchimento).filter(([, valor]) => valor !== undefined)
    ),
    professorId: professorFixo ?? "",
  }));

  const [palestra, setPalestra] = useState<CamposDaPalestra>({
    palestrante: "",
    vagas: "",
    cursoIds: [],
  });

  const [recursos, setRecursos] = useState<string[]>([]);
  const [analise, setAnalise] = useState<AnaliseResult | null>(null);
  const [analisando, iniciarAnalise] = useTransition();

  const [estadoDaReserva, acaoDaReserva, reservando] = useActionState(
    criarReserva,
    ESTADO_INICIAL
  );
  const [estadoDaPalestra, acaoDaPalestra, cadastrando] = useActionState(
    cadastrarPalestra,
    PALESTRA_OCIOSA
  );

  const ehPalestra = campos.activityType === "lecture";
  const vagas = vagasValidas(palestra.vagas);

  function alterar(campo: keyof CamposDaReserva, valor: string) {
    setCampos((atuais) => ({ ...atuais, [campo]: valor }));
  }

  function alterarPalestra<C extends keyof CamposDaPalestra>(
    campo: C,
    valor: CamposDaPalestra[C]
  ) {
    setPalestra((atuais) => ({ ...atuais, [campo]: valor }));
  }

  function alternarRecurso(id: string, marcado: boolean) {
    setRecursos((atuais) =>
      marcado ? [...atuais, id] : atuais.filter((r) => r !== id)
    );
  }

  const periodoPreenchido =
    campos.date !== "" && campos.startTime !== "" && campos.endTime !== "";

  const dadosParaAnalise = ehPalestra
    ? periodoPreenchido
    : campos.professorId !== "" && campos.classId !== "" && periodoPreenchido;

  useEffect(() => {
    if (!dadosParaAnalise) return;

    let atual = true;

    iniciarAnalise(async () => {
      const resultado = ehPalestra
        ? await analisarPalestra({
            date: campos.date,
            startTime: campos.startTime,
            endTime: campos.endTime,
            vagas: 1,
            resourceIds: recursos,
          })
        : await analisarReserva({
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
    ehPalestra,
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

  const atividadeCompleta = ehPalestra
    ? campos.purpose.trim() !== "" &&
      palestra.palestrante.trim() !== "" &&
      palestra.cursoIds.length > 0 &&
      vagas !== null
    : campos.professorId !== "" &&
      campos.classId !== "" &&
      campos.purpose.trim() !== "" &&
      (campos.activityType !== "class" || campos.subjectId !== "");

  const agendaLivre =
    !analisando &&
    analiseAtual?.status === "ok" &&
    analiseAtual.scheduleMessages.length === 0;

  const prontoParaEspacos =
    atividadeCompleta && ehPeriodoValido(campos) && agendaLivre;

  const capacidadeDoEspaco =
    rooms.find((r) => r.id === roomIdValido)?.capacity ?? null;

  const prontoParaConfirmar =
    prontoParaEspacos &&
    roomIdValido !== "" &&
    (!ehPalestra ||
      (vagas !== null &&
        capacidadeDoEspaco !== null &&
        vagas <= capacidadeDoEspaco));

  const formulario = useRef<HTMLFormElement>(null);

  const motivosDaRecusa = ehPalestra
    ? estadoDaPalestra.status === "error"
      ? [
          ...(estadoDaPalestra.mensagem ? [estadoDaPalestra.mensagem] : []),
          ...Object.values(estadoDaPalestra.erros).flat(),
        ]
      : []
    : estadoDaReserva.status === "error"
      ? [
          ...estadoDaReserva.messages,
          ...Object.values(estadoDaReserva.fieldErrors).flat(),
        ]
      : [];

  const conclusao: Conclusao | null =
    estadoDaReserva.status === "success"
      ? { bookingId: estadoDaReserva.bookingId }
      : estadoDaPalestra.status === "success"
        ? { bookingId: null }
        : null;

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() =>
      ehPalestra ? acaoDaPalestra(dados) : acaoDaReserva(dados)
    );
  }

  return {
    campos,
    alterar,
    palestra,
    alterarPalestra,
    ehPalestra,
    recursos,
    alternarRecurso,
    analise: analiseAtual,
    analisando,
    roomIdValido,
    atividadeCompleta,
    prontoParaEspacos,
    prontoParaConfirmar,
    conclusao,
    enviando: reservando || cadastrando,
    enviar,
    formulario,
    motivosDaRecusa,
  };
}
