"use client";

import { toast } from "sonner";
import { RotuloDeCampo } from "@/components/rotulo-de-campo";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ReservaDaLista } from "@/lib/repositories/repositorio-de-reservas";
import { executarEmLote, type ResultadoEmLote } from "@/hooks/use-tabela";

import { cancelarReserva } from "../acoes/cancelar";
import { excluirReserva } from "../acoes/excluir";

function descrever(reserva: ReservaDaLista): string {
  return `${reserva.finalidade}, ${reserva.nomeDoEspaco}`;
}

function comReservaId(reservaId: string, extras: Record<string, string> = {}) {
  const dados = new FormData();
  dados.set("reservaId", reservaId);
  for (const [chave, valor] of Object.entries(extras)) dados.set(chave, valor);
  return dados;
}

function paraResultado(estado: {
  status: string;
  message?: string;
}): ResultadoEmLote {
  return estado.status === "sucesso"
    ? { ok: true }
    : { ok: false, mensagem: estado.message ?? "Não foi possível concluir." };
}

export function cancelarReservasEmLote(
  reservas: ReservaDaLista[],
  motivo: string,
) {
  return executarEmLote(
    reservas,
    async (reserva) =>
      paraResultado(
        await cancelarReserva(
          { status: "inicial" },
          comReservaId(reserva.id, { reason: motivo }),
        ),
      ),
    descrever,
  );
}

export function excluirReservasEmLote(reservas: ReservaDaLista[]) {
  return executarEmLote(
    reservas,
    async (reserva) =>
      paraResultado(
        await excluirReserva({ status: "inicial" }, comReservaId(reserva.id)),
      ),
    descrever,
  );
}

export function CancelarEmLote({
  reservas,
  onFechar,
}: {
  reservas: ReservaDaLista[];
  onFechar: (concluido: boolean) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function confirmar() {
    if (!motivo.trim()) {
      setErro("Informe o motivo do cancelamento.");
      return;
    }

    setErro(null);
    startTransition(async () => {
      const resultado = await cancelarReservasEmLote(reservas, motivo.trim());
      if (resultado.ok) {
        toast.success(
          `${reservas.length} ${reservas.length === 1 ? "reserva cancelada" : "reservas canceladas"}.`,
        );
        onFechar(true);
      } else setErro(resultado.mensagem);
    });
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Cancelar {reservas.length}{" "}
            {reservas.length === 1 ? "reserva" : "reservas"}?
          </DialogTitle>
          <DialogDescription>
            {reservas.map(descrever).join("; ")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="motivoEmLote">
            <RotuloDeCampo rotulo="Motivo" />
          </Label>
          <Textarea
            id="motivoEmLote"
            value={motivo}
            maxLength={200}
            onChange={(evento) => setMotivo(evento.target.value)}
            placeholder="O mesmo motivo vale para todas e é enviado aos professores."
          />
        </div>

        {erro && (
          <p className="text-destructive text-sm" role="alert">
            {erro}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onFechar(false)}>
            Voltar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pendente}
            onClick={confirmar}
          >
            {pendente ? "Cancelando..." : "Cancelar reservas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
