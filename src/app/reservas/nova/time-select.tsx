"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ABERTURA_EM_MINUTOS,
  FECHAMENTO_EM_MINUTOS,
  PASSO_EM_MINUTOS,
  horaParaMinutos,
} from "@/domain/booking/businessHours";

/**
 * SELETOR DE HORÁRIO EM DUAS COLUNAS
 *
 * Substitui o campo type="time" do HTML, e passou por duas versões antes desta.
 *
 * A primeira usava o campo nativo com min, max e step. Não funciona: o Chrome
 * ignora os três ao montar o seletor. Ele exibe as 24 horas e os 60 minutos,
 * deixa escolher 23:47 e só depois marca o campo como inválido, o que é a pior
 * combinação possível: oferecer uma opção para em seguida recusá-la.
 *
 * A segunda trocou por uma lista única com os 181 horários válidos. Corrigia o
 * problema e criava outro: encontrar 19:15 exigia rolar por quase duzentos
 * itens, um de cada vez.
 *
 * Esta versão separa a escolha em duas colunas, como faz o seletor nativo, mas
 * com os valores certos: 16 horas de um lado, 12 minutos do outro. São 28
 * opções na tela no lugar de 181, e nenhuma delas é inválida.
 *
 * O QUE ISTO NÃO É
 *
 * Não é validação. Continua sendo validateBooking, no servidor, quem recusa uma
 * reserva fora do expediente, e há teste para isso. Este componente faz o erro
 * não existir na tela; a regra é quem o impede de ser gravado.
 */

type TimeSelectProps = {
  id: string;
  value: string;
  onChange: (valor: string) => void;
  /**
   * Quando informado, só aparecem horários posteriores a ele.
   *
   * Usado no campo de término, para que não seja possível escolher um horário
   * antes do início.
   */
  minimo?: string;
  /**
   * Quando informado, esconde os horários posteriores a ele.
   *
   * Usado no campo de início: o expediente termina às 22:00 e o término precisa
   * ser posterior ao início, então 22:00 como início deixaria o usuário sem
   * nenhuma opção de término. O servidor recusaria essa reserva, mas a
   * interface o teria conduzido a um estado sem saída.
   */
  maximo?: string;
};

/** 07, 08, ..., 22, respeitando os limites recebidos. */
function horasDisponiveis(
  minimoEmMinutos: number,
  maximoEmMinutos: number
): string[] {
  const horas: string[] = [];

  for (
    let hora = Math.floor(ABERTURA_EM_MINUTOS / 60);
    hora <= Math.floor(FECHAMENTO_EM_MINUTOS / 60);
    hora++
  ) {
    // Uma hora só aparece se existir ao menos um minuto válido dentro dela.
    // É o que remove as horas inteiramente anteriores ao mínimo, e é também o
    // que faz a hora 22 sumir do campo de início, onde o máximo é 21:55.
    const primeiroMinutoDaHora = hora * 60;
    const ultimoMinutoDaHora = Math.min(hora * 60 + 59, maximoEmMinutos);

    if (ultimoMinutoDaHora > minimoEmMinutos &&
        primeiroMinutoDaHora <= maximoEmMinutos) {
      horas.push(String(hora).padStart(2, "0"));
    }
  }

  return horas;
}

/** 00, 05, ..., 55, filtrados pelo que é válido dentro da hora escolhida. */
function minutosDisponiveis(
  hora: string | null,
  minimoEmMinutos: number,
  maximoEmMinutos: number
): string[] {
  if (hora === null) return [];

  const base = Number(hora) * 60;
  const minutos: string[] = [];

  for (let minuto = 0; minuto < 60; minuto += PASSO_EM_MINUTOS) {
    const total = base + minuto;

    // O limite superior é o fechamento, ou o máximo recebido quando ele for
    // mais restritivo. Às 22h no campo de término, só 22:00 é válido; no campo
    // de início, a hora 22 nem chega a aparecer.
    if (total > maximoEmMinutos) break;
    if (total <= minimoEmMinutos) continue;

    minutos.push(String(minuto).padStart(2, "0"));
  }

  return minutos;
}

export function TimeSelect({
  id,
  value,
  onChange,
  minimo,
  maximo,
}: TimeSelectProps) {
  const [aberto, setAberto] = useState(false);

  /**
   * A hora escolhida antes de o minuto ter sido escolhido.
   *
   * Existe porque a seleção acontece em dois cliques. Entre um e outro não há
   * horário completo para entregar a quem chama, e sem guardar este valor a
   * coluna de minutos não saberia de qual hora falar.
   */
  const [horaParcial, setHoraParcial] = useState<string | null>(null);

  const minimoEmMinutos = minimo ? horaParaMinutos(minimo) : -1;
  const maximoEmMinutos = maximo
    ? horaParaMinutos(maximo)
    : FECHAMENTO_EM_MINUTOS;

  const horaSelecionada = value ? value.slice(0, 2) : null;
  const minutoSelecionado = value ? value.slice(3, 5) : null;

  /**
   * A hora que a coluna de minutos está descrevendo.
   *
   * A hora provisória vem PRIMEIRO, e essa ordem é o conserto de um defeito.
   *
   * Antes era o contrário, e com um valor já escolhido a hora dele sempre
   * vencia. O efeito prático: com 22:00 no campo, clicar em 21 não mudava nada.
   * Como o minuto 00 não é válido às 21h quando o mínimo é 21:00, a escolha era
   * guardada como provisória, e a provisória era justamente a que se ignorava.
   * A hora 21 ficava inalcançável.
   *
   * O clique mais recente é o que descreve a intenção de quem está escolhendo,
   * então é ele que manda.
   */
  const horaEmFoco = horaParcial ?? horaSelecionada;

  /**
   * O minuto só aparece destacado quando pertence à hora que está em foco.
   *
   * Sem esta checagem, ao trocar de 22:00 para a hora 21 o minuto 00 continuaria
   * marcado em azul, sugerindo que 21:00 estava escolhido quando o campo ainda
   * marcava 22:00.
   */
  const minutoEmFoco =
    horaEmFoco === horaSelecionada ? minutoSelecionado : null;

  const horas = horasDisponiveis(minimoEmMinutos, maximoEmMinutos);
  const minutos = minutosDisponiveis(
    horaEmFoco,
    minimoEmMinutos,
    maximoEmMinutos
  );

  function escolherHora(hora: string) {
    const candidatos = minutosDisponiveis(
      hora,
      minimoEmMinutos,
      maximoEmMinutos
    );

    // Trocar de hora preserva o minuto quando ele continua válido: quem vai de
    // 19:15 para 20:15 não deveria precisar reescolher o 15.
    if (minutoSelecionado && candidatos.includes(minutoSelecionado)) {
      onChange(`${hora}:${minutoSelecionado}`);
      setHoraParcial(null);
      setAberto(false);
      return;
    }

    setHoraParcial(hora);
  }

  function escolherMinuto(minuto: string) {
    if (horaEmFoco === null) return;

    onChange(`${horaEmFoco}:${minuto}`);
    setHoraParcial(null);
    setAberto(false);
  }

  return (
    <Popover
      open={aberto}
      onOpenChange={(estado) => {
        setAberto(estado);
        // Ao fechar sem completar a escolha, a hora provisória é descartada.
        // Mantê-la faria o seletor reabrir num estado que o campo não reflete.
        if (!estado) setHoraParcial(null);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          // role e aria-expanded fazem o leitor de tela anunciar isto como um
          // controle de seleção, e não como um botão comum.
          role="combobox"
          aria-expanded={aberto}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground"
          )}
        >
          {value || "--:--"}
          <Clock className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex h-56 divide-x">
          <Coluna
            titulo="Hora"
            opcoes={horas}
            selecionada={horaEmFoco}
            onEscolher={escolherHora}
            aberto={aberto}
          />

          <Coluna
            titulo="Min"
            opcoes={minutos}
            selecionada={minutoEmFoco}
            onEscolher={escolherMinuto}
            aberto={aberto}
            // A coluna de minutos só faz sentido depois que a hora existe.
            vazioTexto="Escolha a hora"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Coluna({
  titulo,
  opcoes,
  selecionada,
  onEscolher,
  aberto,
  vazioTexto,
}: {
  titulo: string;
  opcoes: string[];
  selecionada: string | null;
  onEscolher: (valor: string) => void;
  aberto: boolean;
  vazioTexto?: string;
}) {
  const itemSelecionado = useRef<HTMLButtonElement>(null);

  /**
   * Rola até a opção já escolhida quando o seletor abre.
   *
   * Sem isto, reabrir um campo que marca 19:15 mostraria a lista no começo, nas
   * sete da manhã, e o valor atual ficaria fora da tela. O usuário teria de
   * procurar onde já estava.
   */
  useEffect(() => {
    if (aberto && itemSelecionado.current) {
      itemSelecionado.current.scrollIntoView({ block: "center" });
    }
  }, [aberto, selecionada]);

  return (
    <div className="flex w-20 flex-col">
      <p className="text-muted-foreground border-b px-2 py-1.5 text-center text-xs font-medium">
        {titulo}
      </p>

      <div className="flex-1 overflow-y-auto p-1">
        {opcoes.length === 0 && vazioTexto && (
          <p className="text-muted-foreground px-2 py-3 text-center text-xs">
            {vazioTexto}
          </p>
        )}

        {opcoes.map((opcao) => {
          const ativa = opcao === selecionada;

          return (
            <button
              key={opcao}
              ref={ativa ? itemSelecionado : undefined}
              type="button"
              onClick={() => onEscolher(opcao)}
              className={cn(
                "w-full rounded-sm px-2 py-1.5 text-center text-sm transition-colors",
                ativa
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {opcao}
            </button>
          );
        })}
      </div>
    </div>
  );
}
