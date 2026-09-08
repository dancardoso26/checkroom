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

import { CAMPOS_VAZIOS, ehPeriodoValido, type CamposDaReserva } from "./campos";
import { ETAPAS, Stepper } from "./stepper";
import { EtapaAtividade } from "./etapa-atividade";
import { EtapaHorario } from "./etapa-horario";
import { EtapaNecessidades } from "./etapa-necessidades";
import { EtapaEspaco } from "./etapa-espaco";
import { EtapaConfirmacao } from "./etapa-confirmacao";
import { Resumo } from "./resumo";
import { Confirmada } from "./reserva-confirmada";

/**
 * Formulário de nova reserva, em cinco etapas: atividade, data e horário,
 * necessidades, espaço e confirmação. Cada uma mora em seu arquivo nesta pasta;
 * aqui ficam só o estado dos campos, o disparo da análise e o avanço.
 *
 * As etapas 2 e 4 consultam o servidor pela Server Action de análise, que roda a
 * mesma regra usada na gravação. Nada é reimplementado no cliente.
 *
 * Ainda não há disciplina, vínculo professor-turma nem calendário letivo, então
 * a etapa 1 não confirma que a professora leciona para aquela turma e a etapa 2
 * não verifica o período letivo. Dependem de tabelas das entregas seguintes.
 *
 * O envio é feito no onSubmit, e não no atributo action, porque o React 19 limpa
 * o formulário quando a action termina, e nos componentes do Radix esse reset
 * dispara onValueChange("") e onCheckedChange(false), zerando o preenchimento.
 */

type BookingWizardProps = {
  rooms: RoomOption[];
  professors: ProfessorOption[];
  classes: ClassOption[];
  resources: ResourceOption[];
  hoje: string;
};

const ESTADO_INICIAL: BookingFormState = { status: "idle" };

export function BookingWizard({
  rooms,
  professors,
  classes,
  resources,
  hoje,
}: BookingWizardProps) {
  const [etapa, setEtapa] = useState(0);

  const [campos, setCampos] = useState<CamposDaReserva>(() =>
    CAMPOS_VAZIOS(hoje)
  );

  const [recursos, setRecursos] = useState<string[]>([]);

  /**
   * A etapa 2 lê os conflitos de agenda e a etapa 4 lê a lista de espaços: são
   * recortes da mesma chamada.
   */
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

  /**
   * Pede uma análise nova sempre que muda algo que altera a resposta.
   *
   * roomId fica fora das dependências de propósito: escolher um espaço não muda
   * o julgamento dos outros, e refazer a análise a cada clique apagaria a
   * seleção.
   */
  useEffect(() => {
    // Limpar o estado daqui seria escrever de dentro de um efeito, o que provoca
    // renderização em cascata. Quem descarta o resultado antigo é a derivação
    // logo abaixo.
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
    campos.date,
    campos.startTime,
    campos.endTime,
    recursos,
  ]);

  /**
   * A análise que vale para os dados que estão na tela agora. Quando falta
   * preencher algo, o resultado guardado descreve um pedido que não existe mais.
   */
  const analiseAtual = dadosParaAnalise ? analise : null;

  /**
   * O espaço escolhido, só enquanto continuar servindo. Sem isto, trocar o
   * horário depois de escolher levaria à confirmação com um espaço ocupado, e o
   * erro só apareceria na gravação.
   */
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

  /**
   * Falso também enquanto a análise está em andamento: avançar sem saber é pior
   * do que esperar meio segundo.
   */
  const agendaLivre =
    !analisando &&
    analiseAtual?.status === "ok" &&
    analiseAtual.scheduleMessages.length === 0;

  /**
   * O que cada etapa exige para liberar o avanço.
   *
   * A etapa 2 é a única que bloqueia por resultado do servidor, contrariando o
   * padrão de avisar em vez de impedir. A razão: conflito de agenda não se
   * resolve nas etapas seguintes, ao contrário do aviso de capacidade. Deixar
   * avançar levaria a pessoa por três telas para recusar no fim.
   *
   * O botão desabilitado nunca aparece sozinho, o aviso acima diz o motivo. E
   * nada disso é validação: quem recusa é a regra no servidor.
   */
  const podeAvancar = [
    campos.professorId !== "" && campos.classId !== "" && campos.purpose.trim() !== "",
    periodoPreenchido && ehPeriodoValido(campos) && agendaLivre,
    true,
    roomIdValido !== "" && !analisando,
    true,
  ][etapa];

  /** Usada pelo botão da última etapa; o motivo está na declaração dele. */
  const formulario = useRef<HTMLFormElement>(null);

  /**
   * As violações da regra e os erros de formato do Zod em uma lista só: do ponto
   * de vista de quem preencheu, ambos respondem a mesma pergunta. Os fieldErrors
   * eram descartados em silêncio, e uma requisição vinda de fora do formulário
   * recusava a reserva sem dizer por quê.
   */
  const motivosDaRecusa =
    state.status === "error"
      ? [...state.messages, ...Object.values(state.fieldErrors).flat()]
      : [];

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
                />
              )}
            </CardContent>
          </Card>

          {/* Ficam fora das etapas: dentro delas, os valores das etapas não
              visíveis não seriam enviados. */}
          <input type="hidden" name="roomId" value={roomIdValido} />
          <input type="hidden" name="professorId" value={campos.professorId} />
          <input type="hidden" name="classId" value={campos.classId} />
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

            {/*
              Os dois botões são type="button" e têm key diferente, o que evita um
              defeito real: quando eles alternavam entre button e submit, clicar
              em "Continuar" na etapa do espaço CRIAVA a reserva, pulando a
              revisão.

              O onClick avança a etapa, o React re-renderiza de forma síncrona
              reaproveitando o mesmo nó do DOM e trocando o type, e só então o
              navegador aplica o comportamento padrão do clique, encontrando um
              submit. As chaves impedem o reaproveitamento; o type fixo garante
              que o envio aconteça só onde está escrito.
            */}
            {etapa < ETAPAS.length - 1 ? (
              <Button
                key="avancar"
                type="button"
                disabled={!podeAvancar}
                onClick={() => setEtapa((e) => e + 1)}
              >
                {/* Na etapa da agenda, o rótulo diz por que o botão está
                    parado. Sem isso, meio segundo de espera pareceria um botão
                    quebrado. */}
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
        />
      </div>
    </div>
  );
}
