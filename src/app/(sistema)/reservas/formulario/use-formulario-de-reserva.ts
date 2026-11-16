"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import type { TipoDeAtividade } from "@/domain/reservas/tipos";
import { ESTADO_INICIAL as PALESTRA_OCIOSA } from "@/lib/formulario";

import { cadastrarPalestra } from "../../palestras/acoes";
import { criarReserva, type EstadoDoFormularioDeReserva } from "../acoes/criar";
import {
  analisarPalestra,
  analisarReserva,
  type ResultadoDaAnalise,
} from "./analise";
import { CAMPOS_VAZIOS, ehPeriodoValido, type CamposDaReserva } from "./campos";

const ESTADO_INICIAL: EstadoDoFormularioDeReserva = { status: "inicial" };

export type Preenchimento = {
  data?: string;
  horaDeInicio?: string;
  horaDeTermino?: string;
  tipoDeAtividade?: TipoDeAtividade;
};

export type CamposDaPalestra = {
  palestrante: string;
  vagas: string;
  cursoIds: string[];
};

export type Conclusao = { reservaId: string | null };

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
  espacos: rooms,
}: {
  espacos: { id: string; capacidade: number }[];
  hoje: string;
  professorFixo: string | null;
  preenchimento: Preenchimento;
}) {
  const [campos, setCampos] = useState<CamposDaReserva>(() => ({
    ...CAMPOS_VAZIOS(hoje),
    ...Object.fromEntries(
      Object.entries(preenchimento).filter(([, valor]) => valor !== undefined),
    ),
    professorId: professorFixo ?? "",
  }));

  const [palestra, setPalestra] = useState<CamposDaPalestra>({
    palestrante: "",
    vagas: "",
    cursoIds: [],
  });

  const [recursos, setRecursos] = useState<string[]>([]);
  const [analise, setAnalise] = useState<ResultadoDaAnalise | null>(null);
  const [analisando, iniciarAnalise] = useTransition();

  const [estadoDaReserva, acaoDaReserva, reservando] = useActionState(
    criarReserva,
    ESTADO_INICIAL,
  );
  const [estadoDaPalestra, acaoDaPalestra, cadastrando] = useActionState(
    cadastrarPalestra,
    PALESTRA_OCIOSA,
  );

  const ehPalestra = campos.tipoDeAtividade === "lecture";
  const vagas = vagasValidas(palestra.vagas);

  function alterar(campo: keyof CamposDaReserva, valor: string) {
    setCampos((atuais) => ({ ...atuais, [campo]: valor }));
  }

  function alterarPalestra<C extends keyof CamposDaPalestra>(
    campo: C,
    valor: CamposDaPalestra[C],
  ) {
    setPalestra((atuais) => ({ ...atuais, [campo]: valor }));
  }

  function alternarRecurso(id: string, marcado: boolean) {
    setRecursos((atuais) =>
      marcado ? [...atuais, id] : atuais.filter((r) => r !== id),
    );
  }

  const periodoPreenchido =
    campos.data !== "" &&
    campos.horaDeInicio !== "" &&
    campos.horaDeTermino !== "";

  const dadosParaAnalise = ehPalestra
    ? periodoPreenchido
    : campos.professorId !== "" && campos.turmaId !== "" && periodoPreenchido;

  useEffect(() => {
    if (!dadosParaAnalise) return;

    let atual = true;

    iniciarAnalise(async () => {
      const resultado = ehPalestra
        ? await analisarPalestra({
            data: campos.data,
            horaDeInicio: campos.horaDeInicio,
            horaDeTermino: campos.horaDeTermino,
            vagas: 1,
            recursoIds: recursos,
          })
        : await analisarReserva({
            professorId: campos.professorId,
            turmaId: campos.turmaId,
            data: campos.data,
            horaDeInicio: campos.horaDeInicio,
            horaDeTermino: campos.horaDeTermino,
            tipoDeAtividade: campos.tipoDeAtividade,
            disciplinaId: campos.disciplinaId,
            recursoIds: recursos,
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
    campos.turmaId,
    campos.disciplinaId,
    campos.tipoDeAtividade,
    campos.data,
    campos.horaDeInicio,
    campos.horaDeTermino,
    recursos,
  ]);

  const analiseAtual = dadosParaAnalise ? analise : null;

  const espacoIdValido =
    campos.espacoId !== "" &&
    analiseAtual?.status === "ok" &&
    analiseAtual.espacos.find((r) => r.espacoId === campos.espacoId)?.compativel
      ? campos.espacoId
      : "";

  const atividadeCompleta = ehPalestra
    ? campos.finalidade.trim() !== "" &&
      palestra.palestrante.trim() !== "" &&
      palestra.cursoIds.length > 0 &&
      vagas !== null
    : campos.professorId !== "" &&
      campos.turmaId !== "" &&
      campos.finalidade.trim() !== "" &&
      (campos.tipoDeAtividade !== "class" || campos.disciplinaId !== "");

  const agendaLivre =
    !analisando &&
    analiseAtual?.status === "ok" &&
    analiseAtual.mensagensDeHorario.length === 0;

  const prontoParaEspacos =
    atividadeCompleta && ehPeriodoValido(campos) && agendaLivre;

  const capacidadeDoEspaco =
    rooms.find((r) => r.id === espacoIdValido)?.capacidade ?? null;

  const prontoParaConfirmar =
    prontoParaEspacos &&
    espacoIdValido !== "" &&
    (!ehPalestra ||
      (vagas !== null &&
        capacidadeDoEspaco !== null &&
        vagas <= capacidadeDoEspaco));

  const formulario = useRef<HTMLFormElement>(null);

  const motivosDaRecusa = ehPalestra
    ? estadoDaPalestra.status === "erro"
      ? [
          ...(estadoDaPalestra.mensagem ? [estadoDaPalestra.mensagem] : []),
          ...Object.values(estadoDaPalestra.erros).flat(),
        ]
      : []
    : estadoDaReserva.status === "erro"
      ? [
          ...estadoDaReserva.mensagens,
          ...Object.values(estadoDaReserva.errosPorCampo).flat(),
        ]
      : [];

  const conclusao: Conclusao | null =
    estadoDaReserva.status === "sucesso"
      ? { reservaId: estadoDaReserva.reservaId }
      : estadoDaPalestra.status === "sucesso"
        ? { reservaId: null }
        : null;

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() =>
      ehPalestra ? acaoDaPalestra(dados) : acaoDaReserva(dados),
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
    espacoIdValido,
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
