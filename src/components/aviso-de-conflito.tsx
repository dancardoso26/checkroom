import { CalendarX2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AvisoDeConflito({
  mensagem,
  onFechar,
}: {
  mensagem: string | null;
  onFechar: () => void;
}) {
  return (
    <Dialog
      open={mensagem !== null}
      onOpenChange={(aberto) => {
        if (!aberto) onFechar();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="top-1/2 right-auto bottom-auto left-1/2 h-auto w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 justify-items-center rounded-xl border p-6 text-center data-[state=closed]:animate-none! data-[state=open]:animate-none!"
      >
        <span className="bg-destructive/10 text-destructive flex size-14 items-center justify-center rounded-full">
          <CalendarX2 className="size-7" aria-hidden />
        </span>
        <DialogHeader className="items-center pr-0 text-center">
          <DialogTitle>Conflito de horário</DialogTitle>
          <DialogDescription>{mensagem}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="w-full sm:justify-center">
          <Button onClick={onFechar}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
