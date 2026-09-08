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
 * FORMULÁRIO DE NOVA RESERVA, EM ETAPAS
 *
 * Este arquivo cuida de três coisas, e só delas: o estado dos campos, quando
 * pedir uma análise ao servidor, e quando liberar o avanço. Cada etapa mora em
 * seu próprio arquivo nesta pasta.
 *
 * A separação veio depois de uma revisão apontar que o arquivo único já passava
 * de mil linhas. O problema não era o tamanho em si: era que a lógica de
 * navegação ficava soterrada entre marcação de cinco telas, e quem procurasse
 * "por que este botão não habilita" precisava percorrer tudo.
 *
 * O QUE CADA ETAPA RESOLVE
 *
 *   1. Atividade    quem, para qual turma, com que finalidade
 *   2. Data e hora  o professor e a turma estão livres nesse horário?
 *   3. Necessidades o que a atividade exige do espaço
 *   4. Espaço       quais espaços atendem, e por que os outros não
 *   5. Confirmação  revisão antes de gravar
 *
 * As etapas 2 e 4 consultam o servidor pela Server Action de análise, que roda
 * exatamente a mesma regra usada na gravação. Nenhuma verificação é
 * reimplementada no cliente: os arquivos desta pasta cuidam de apresentação.
 *
 * O QUE ESTA VERSÃO AINDA NÃO FAZ
 *
 * O modelo de dados desta entrega não tem disciplina, vínculo do professor com
 * a turma nem calendário letivo. Por isso a etapa 1 não confirma "esta
 * professora leciona esta disciplina para esta turma", e a etapa 2 não verifica
 * se a data cai dentro do período letivo. As duas dependem de tabelas previstas
 * para as entregas seguintes.
 *
 * POR QUE O ENVIO É FEITO NO onSubmit, E NÃO NO ATRIBUTO action
 *
 * O React 19 limpa um formulário com action assim que ela termina. Nos
 * componentes do Radix, que estão sob o shadcn, esse reset dispara
 * onValueChange("") e onCheckedChange(false), zerando o que o usuário
 * preencheu. Chamando a action a partir do onSubmit, o reset não acontece.
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
   * O resultado da última análise pedida ao servidor.
   *
   * Nulo enquanto não houver dados suficientes. A etapa 2 lê os conflitos de
   * agenda; a etapa 4 lê a lista de espaços. As duas vêm da mesma chamada,
   * porque são recortes da mesma decisão.
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
   * useEffect é o lugar certo aqui: sincronizar com um sistema externo, no caso
   * o servidor, é exatamente o que o hook existe para fazer. Não haveria como
   * calcular isto durante a renderização, porque a resposta depende da agenda.
   *
   * A dependência inclui os recursos porque eles mudam quais espaços atendem,
   * mas não inclui roomId: escolher um espaço não altera o julgamento dos
   * outros, e refazer a análise a cada clique da lista apagaria a seleção.
   */
  useEffect(() => {
    // Sem dados suficientes não há o que perguntar. O efeito apenas não faz
    // nada; limpar o estado daqui seria escrever no React de dentro de um
    // efeito, o que provoca uma renderização em cascata. Quem descarta o
    // resultado antigo é a derivação logo abaixo do efeito.
    if (!dadosParaAnalise) return;

    // A flag existe para descartar a resposta de uma análise que ficou obsoleta
    // enquanto viajava. Sem ela, uma consulta lenta poderia chegar depois de
    // outra mais recente e sobrescrever o resultado certo pelo antigo.
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
   * A análise que vale para os dados que estão na tela AGORA.
   *
   * Quando falta preencher algo, o resultado guardado no estado passa a
   * descrever um pedido que não existe mais, e ignorá-lo aqui é mais barato e
   * mais seguro do que apagá-lo dentro do efeito.
   *
   * Esta linha substituiu um setAnalise(null) que ficava no efeito acima.
   * Escrever no estado de dentro de um efeito provoca uma renderização em
   * cascata: o React pinta a tela, o efeito roda, o estado muda, a tela é
   * pintada de novo. O ESLint aponta esse padrão, e a orientação da
   * documentação do React é a mesma: o que pode ser calculado durante a
   * renderização não deve virar estado.
   */
  const analiseAtual = dadosParaAnalise ? analise : null;

  /**
   * O espaço escolhido, mas só enquanto ele continuar servindo.
   *
   * O professor escolhe o laboratório na etapa 4, volta para trocar o horário e
   * o laboratório fica ocupado. Sem esta derivação, ele seguiria para a
   * confirmação com um espaço que já não serve, e descobriria na gravação.
   *
   * Aqui também havia um efeito que zerava campos.roomId, e ele deu lugar a uma
   * expressão pelo mesmo motivo do anterior. A vantagem prática é que a resposta
   * nunca fica desatualizada: não existe o intervalo entre a análise chegar e o
   * efeito reagir, porque não há efeito.
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
   * A agenda está livre no horário escolhido?
   *
   * Verdadeiro só quando a análise já voltou do servidor e não encontrou nada.
   * Enquanto ela está em andamento, ou quando ainda faltam dados, a resposta é
   * falsa: avançar sem saber é pior do que esperar meio segundo.
   */
  const agendaLivre =
    !analisando &&
    analiseAtual?.status === "ok" &&
    analiseAtual.scheduleMessages.length === 0;

  /**
   * O que cada etapa exige para liberar o avanço.
   *
   * A segunda etapa é a única que bloqueia por um resultado do servidor, e a
   * razão vale ser registrada, porque contraria o padrão adotado no resto do
   * formulário.
   *
   * Em toda outra situação a escolha é avisar, não impedir. O aviso de
   * capacidade da primeira etapa é assim: a turma não cabe naquele espaço, mas
   * cabe em outro, e a etapa seguinte é exatamente onde isso se resolve.
   *
   * Conflito de agenda é de outra natureza. Se o professor ou a turma já têm
   * compromisso naquele horário, nenhuma escolha de espaço ou de recurso
   * desfaz: a única saída é voltar e trocar o horário. Deixar avançar seria
   * conduzir a pessoa por três telas para recusar o pedido no fim, com a
   * informação que já estava disponível na segunda.
   *
   * O botão desabilitado nunca aparece sozinho: o aviso vermelho acima dele diz
   * qual é o conflito e com qual reserva. Bloquear sem explicar seria pior do
   * que não bloquear.
   *
   * Nada disso é validação. Quem recusa a reserva continua sendo a regra no
   * servidor, e ela é refeita no envio porque a agenda pode mudar no intervalo.
   */
  const podeAvancar = [
    campos.professorId !== "" && campos.classId !== "" && campos.purpose.trim() !== "",
    periodoPreenchido && ehPeriodoValido(campos) && agendaLivre,
    true,
    roomIdValido !== "" && !analisando,
    true,
  ][etapa];

  /**
   * Referência ao formulário, usada para disparar o envio a partir do botão da
   * última etapa. O motivo está explicado logo abaixo, na declaração do botão.
   */
  const formulario = useRef<HTMLFormElement>(null);

  /**
   * Tudo o que impediu a reserva, em uma lista só.
   *
   * A Server Action devolve duas coisas: "messages", que são as violações da
   * regra de negócio, e "fieldErrors", que são problemas de formato apontados
   * pelo Zod, indexados por campo.
   *
   * O formulário exibia apenas as primeiras, e os fieldErrors eram descartados
   * em silêncio. Na prática isso quase nunca aparecia, porque os campos são
   * controlados e o wizard só libera o avanço com tudo preenchido. Mas "quase
   * nunca" é diferente de nunca: bastava um envio com um campo em branco, ou
   * uma requisição vinda de fora do formulário, para a tela recusar a reserva
   * sem dizer por quê.
   *
   * Os dois grupos são juntados aqui em vez de exibidos separadamente porque,
   * do ponto de vista de quem preencheu, ambos respondem a mesma pergunta: por
   * que não deu certo.
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

          {/* Os campos ocultos carregam tudo ao envio. Ficam fora das etapas
              porque o formulário só existe uma vez: se estivessem dentro de
              cada etapa, os valores das etapas não visíveis não seriam
              enviados. */}
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
              OS DOIS BOTÕES SÃO type="button", E TÊM key DIFERENTE

              Parece exagero para um botão que muda de rótulo, e não é. A versão
              anterior alternava entre type="button" na etapa de escolha do
              espaço e type="submit" na confirmação, e produzia um defeito que
              custou uma sessão de depuração para ser entendido: clicar em
              "Continuar" na etapa do espaço CRIAVA a reserva, pulando a revisão.

              O motivo é a ordem dos acontecimentos em um clique. O onClick roda,
              avança a etapa e o React re-renderiza de forma síncrona. Como os
              dois botões ocupavam a mesma posição na árvore, o React reaproveitou
              o mesmo nó do DOM e apenas trocou o atributo type. Só então o
              navegador aplicou o comportamento padrão do clique, e o botão que
              ele encontrou já era um submit.

              A correção tem duas partes. As chaves diferentes fazem o React
              descartar um nó e criar outro, em vez de reaproveitar. E manter os
              dois como type="button" garante que nenhum clique submeta por
              conta própria: o envio acontece só onde está escrito que acontece.
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
                // requestSubmit dispara o onSubmit do formulário, passando pelas
                // mesmas validações do navegador que um submit comum. Chamar
                // submit() puro as ignoraria.
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
