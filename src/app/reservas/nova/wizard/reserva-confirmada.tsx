"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function Confirmada({ bookingId }: { bookingId: string }) {
  return (
    <Card>
      <CardContent className="space-y-4 py-10 text-center">
        <p className="text-xl font-semibold">Reserva confirmada</p>
        <p className="text-muted-foreground text-sm">
          O espaço foi reservado para a atividade.
        </p>

        {/* O identificador aparece porque é o que o professor cita ao abrir um
            chamado ou pedir cancelamento à secretaria. */}
        <p className="text-muted-foreground font-mono text-xs">{bookingId}</p>

        <div className="flex justify-center gap-3 pt-2">
          <Button asChild>
            <Link href="/reservas">Ver na agenda</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/reservas/nova">Nova reserva</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
