"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { X } from "lucide-react";

import { cancelarReserva, type CancelamentoState } from "./cancelar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Botão de cancelar, com confirmação.
 *
 * A confirmação não é formalidade: cancelar é destrutivo do ponto de vista de
 * quem contava com a sala, e um clique acidental na listagem desfaria a aula de
 * outra pessoa. O motivo é opcional, mas pedi-lo no mesmo passo aproveita o
 * momento em que quem cancela ainda sabe por quê.
 */

const ESTADO_INICIAL: CancelamentoState = { status: "idle" };

export function CancelarReserva({
  bookingId,
  descricao,
}: {
  bookingId: string;
  /** Aparece na confirmação, para não cancelar a reserva errada. */
  descricao: string;
}) {
  const [aberto, setAberto] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);

  const [state, formAction, cancelando] = useActionState(
    cancelarReserva,
    ESTADO_INICIAL
  );

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => formAction(dados));
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
        >
          <X />
          Cancelar
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="end">
        <form ref={formulario} onSubmit={enviar} className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Cancelar esta reserva?</p>
            <p className="text-muted-foreground text-sm">{descricao}</p>
          </div>

          <input type="hidden" name="bookingId" value={bookingId} />

          <div className="space-y-2">
            <Label htmlFor={`motivo-${bookingId}`} className="text-xs">
              Motivo (opcional)
            </Label>
            <Input
              id={`motivo-${bookingId}`}
              name="reason"
              placeholder="Professor afastado"
              maxLength={200}
            />
          </div>

          {state.status === "error" && (
            <p className="text-destructive text-sm" role="alert">
              {state.message}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAberto(false)}
            >
              Voltar
            </Button>

            {/*
              type="button" com requestSubmit, e não type="submit", pelo mesmo
              motivo do formulário de reserva: o React 19 limpa formulários com
              action, e alternar o tipo de um botão durante o clique já produziu
              um envio acidental neste projeto.
            */}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={cancelando}
              onClick={() => formulario.current?.requestSubmit()}
            >
              {cancelando ? "Cancelando..." : "Confirmar"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
