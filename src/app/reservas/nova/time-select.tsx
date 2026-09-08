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
 * Seletor de horário em duas colunas, no lugar do campo type="time".
 *
 * O campo nativo não serve porque o Chrome ignora min, max e step ao montar o
 * seletor: exibe as 24 horas, deixa escolher 23:47 e só então marca o campo como
 * inválido. Oferecer uma opção para em seguida recusá-la é o pior dos mundos.
 *
 * Uma lista única com os 181 horários válidos corrigia isso e criava outro
 * problema: achar 19:15 exigia rolar por quase duzentos itens. Duas colunas
 * deixam 28 opções na tela, e nenhuma inválida.
 *
 * Não é validação: quem recusa uma reserva fora do expediente é validateBooking,
 * no servidor, e há teste para isso.
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
   * Usado no campo de início: 22:00 como início deixaria o usuário sem nenhuma
   * opção de término, um estado sem saída que só o servidor recusaria.
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
    // Uma hora só aparece se tiver ao menos um minuto válido: é o que remove as
    // anteriores ao mínimo e faz a hora 22 sumir do campo de início.
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

    // Às 22h no campo de término só 22:00 é válido; no de início, a hora 22 nem
    // chega a aparecer.
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
   * A seleção acontece em dois cliques, e entre eles não há horário completo
   * para entregar a quem chama.
   */
  const [horaParcial, setHoraParcial] = useState<string | null>(null);

  const minimoEmMinutos = minimo ? horaParaMinutos(minimo) : -1;
  const maximoEmMinutos = maximo
    ? horaParaMinutos(maximo)
    : FECHAMENTO_EM_MINUTOS;

  const horaSelecionada = value ? value.slice(0, 2) : null;
  const minutoSelecionado = value ? value.slice(3, 5) : null;

  /**
   * A hora provisória vem PRIMEIRO, e a ordem conserta um defeito: com o valor
   * vencendo, ter 22:00 no campo tornava a hora 21 inalcançável, porque o minuto
   * 00 não é válido às 21h e a escolha virava provisória, que era ignorada.
   */
  const horaEmFoco = horaParcial ?? horaSelecionada;

  /**
   * Sem esta checagem, trocar de 22:00 para a hora 21 deixaria o minuto 00
   * marcado, sugerindo uma escolha que o campo ainda não reflete.
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

    // Quem vai de 19:15 para 20:15 não deveria reescolher o 15.
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
        // Descarta a hora provisória: mantê-la faria o seletor reabrir num
        // estado que o campo não reflete.
        if (!estado) setHoraParcial(null);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          // Anuncia como controle de seleção, e não como botão comum.
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
   * Sem isto, reabrir um campo que marca 19:15 mostraria a lista nas sete da
   * manhã, com o valor atual fora da tela.
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
