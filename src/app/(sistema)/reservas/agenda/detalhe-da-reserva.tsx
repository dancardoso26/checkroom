"use client";

import { toast } from "sonner";
import Link from "next/link";
import { useState, useTransition } from "react";
import { AvisoDeConflito } from "@/components/aviso-de-conflito";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MENSAGEM_DA_INSCRICAO } from "@/domain/palestras/palestra";
import { statusDaReserva } from "@/domain/status/status";
import { formatFullDate, formatPeriod } from "@/lib/datetime";
import { RotuloDeCampo } from "@/components/rotulo-de-campo";
import { Loader2, Trash2, X } from "lucide-react";
import type { BookingListItem } from "@/lib/repositories/repositorio-de-reservas";

import { cancelarInscricao, inscreverEmPalestra } from "../../palestras/acoes";
import { ROTULO_DA_ATIVIDADE } from "../formulario/campos";

export function DetalheDaReserva({
  reserva,
  agora,
  vePalestras,
  podeExcluirPalestra,
  onFechar,
  onCancelar,
  onExcluir,
}: {
  reserva: BookingListItem;
  agora: Date;
  vePalestras: boolean;
  podeExcluirPalestra: boolean;
  onFechar: () => void;
  onCancelar: () => void;
  onExcluir: () => void;
}) {
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [conflito, setConflito] = useState<string | null>(null);

  const idDaPalestra = reserva.id.replace("palestra:", "");
  const podeInscrever = reserva.ehPalestra && reserva.inscricaoAberta;
  const podeCancelarInscricao = reserva.ehPalestra && reserva.inscrito;

  function alterarInscricao(
    acao: (id: string) => Promise<{ ok: boolean; mensagem?: string }>,
    sucesso: string,
  ) {
    setErro(null);
    startTransition(async () => {
      const resultado = await acao(idDaPalestra);
      if (resultado.ok) {
        toast.success(sucesso);
        return;
      }
      if (resultado.mensagem === MENSAGEM_DA_INSCRICAO.CONFLITO_DE_HORARIO) {
        setConflito(resultado.mensagem);
      } else {
        setErro(resultado.mensagem ?? null);
      }
    });
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle
            className={reserva.cancelled ? "line-through" : undefined}
          >
            {reserva.purpose}
          </DialogTitle>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-normal">
              {ROTULO_DA_ATIVIDADE[reserva.activityType]}
            </Badge>
            <StatusBadge status={statusDaReserva(reserva, agora)} />
          </div>

          <DialogDescription className="sr-only first-letter:uppercase">
            {formatFullDate(reserva.startsAt)}
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 text-sm">
          <Linha termo="Data e hora">
            {formatPeriod(reserva.startsAt, reserva.endsAt)}
          </Linha>
          <Linha termo="Espaço">{reserva.roomName}</Linha>
          <Linha termo={reserva.ehPalestra ? "Palestrante" : "Professor"}>
            {reserva.professorName}
          </Linha>
          <Linha termo={reserva.ehPalestra ? "Cursos" : "Turma"}>
            {reserva.className}
          </Linha>
          {reserva.subjectName && (
            <Linha termo="Disciplina">{reserva.subjectName}</Linha>
          )}
          {reserva.resourceNames.length > 0 && (
            <Linha termo="Recursos">{reserva.resourceNames.join(", ")}</Linha>
          )}
        </dl>

        {reserva.cancelled && reserva.cancellationReason && (
          <p className="text-muted-foreground text-sm italic">
            Motivo do cancelamento: {reserva.cancellationReason}
          </p>
        )}

        {erro && (
          <p className="text-destructive text-sm" role="alert">
            {erro}
          </p>
        )}

        {reserva.ehPalestra ? (
          (vePalestras ||
            podeExcluirPalestra ||
            podeInscrever ||
            podeCancelarInscricao) && (
            <div className="flex justify-end gap-2 border-t pt-3">
              {podeExcluirPalestra && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={onExcluir}
                >
                  <Trash2 />
                  Excluir palestra
                </Button>
              )}
              {vePalestras && (
                <Button asChild variant="outline">
                  <Link href="/palestras">Ver palestras</Link>
                </Button>
              )}
              {podeInscrever && (
                <Button
                  disabled={pendente}
                  onClick={() => alterarInscricao(inscreverEmPalestra, "Inscrição realizada.")}
                >
                  {pendente && <Loader2 className="animate-spin" aria-hidden />}
                  Inscrever-se
                </Button>
              )}
              {podeCancelarInscricao && (
                <Button
                  variant="outline"
                  disabled={pendente}
                  onClick={() => alterarInscricao(cancelarInscricao, "Inscrição cancelada.")}
                >
                  {pendente ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <X aria-hidden />
                  )}
                  Cancelar inscrição
                </Button>
              )}
            </div>
          )
        ) : reserva.gerenciavel ? (
          <div className="flex justify-end gap-2 border-t pt-3">
            {!reserva.cancelled && (
              <Button variant="outline" onClick={onCancelar}>
                <X />
                Cancelar reserva
              </Button>
            )}
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onExcluir}
            >
              <Trash2 />
              Excluir
            </Button>
          </div>
        ) : null}
      </DialogContent>

      <AvisoDeConflito mensagem={conflito} onFechar={() => setConflito(null)} />
    </Dialog>
  );
}

function Linha({
  termo,
  children,
}: {
  termo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">
        <RotuloDeCampo rotulo={termo} />
      </dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
