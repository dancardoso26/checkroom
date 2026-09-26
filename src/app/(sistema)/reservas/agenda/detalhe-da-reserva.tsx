"use client";

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Clock,
  MapPin,
  Monitor,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";

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
import { statusDaReserva } from "@/domain/status/status";
import { formatFullDate, formatTimeRange } from "@/lib/datetime";
import type { BookingListItem } from "@/lib/repositories/bookingRepository";

import { ROTULO_DA_ATIVIDADE } from "../formulario/campos";

// Cancelar e excluir fecham este detalhe e abrem a confirmação no lugar dele:
// dois diálogos empilhados escureciam a tela duas vezes.
export function DetalheDaReserva({
  reserva,
  agora,
  onFechar,
  onCancelar,
  onExcluir,
}: {
  reserva: BookingListItem;
  agora: Date;
  onFechar: () => void;
  onCancelar: () => void;
  onExcluir: () => void;
}) {
  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-normal">
              {ROTULO_DA_ATIVIDADE[reserva.activityType]}
            </Badge>
            <StatusBadge status={statusDaReserva(reserva, agora)} />
          </div>

          <DialogTitle
            className={reserva.cancelled ? "line-through" : undefined}
          >
            {reserva.purpose}
          </DialogTitle>

          <DialogDescription className="first-letter:uppercase">
            {formatFullDate(reserva.startsAt)}
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 text-sm">
          <Linha icone={Clock} termo="Horário">
            {formatTimeRange(reserva.startsAt, reserva.endsAt)}
          </Linha>
          <Linha icone={MapPin} termo="Espaço">
            {reserva.building} · {reserva.roomName}
          </Linha>
          <Linha icone={User} termo="Professor">
            {reserva.professorName}
          </Linha>
          <Linha icone={Users} termo="Turma">
            {reserva.className}
          </Linha>
          {reserva.subjectName && (
            <Linha icone={BookOpen} termo="Disciplina">
              {reserva.subjectName}
            </Linha>
          )}
          {reserva.resourceNames.length > 0 && (
            <Linha icone={Monitor} termo="Necessidades">
              {reserva.resourceNames.join(", ")}
            </Linha>
          )}
        </dl>

        {reserva.cancelled && reserva.cancellationReason && (
          <p className="text-muted-foreground text-sm italic">
            Motivo do cancelamento: {reserva.cancellationReason}
          </p>
        )}

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
      </DialogContent>
    </Dialog>
  );
}

function Linha({
  icone: Icone,
  termo,
  children,
}: {
  icone: LucideIcon;
  termo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <Icone aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
      <div>
        <dt className="text-muted-foreground text-xs">{termo}</dt>
        <dd className="font-medium">{children}</dd>
      </div>
    </div>
  );
}
