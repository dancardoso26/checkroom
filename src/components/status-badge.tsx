import { Badge } from "@/components/ui/badge";
import { STATUS, type Status, type Tom } from "@/domain/status/status";
import { cn } from "@/lib/utils";

const CLASSES: Record<Tom, string> = {
  sucesso: "border-success/30 bg-success-subtle text-success",
  informacao: "border-primary/30 bg-primary-subtle text-primary",
  perigo: "border-destructive/30 bg-destructive-subtle text-destructive",
  atencao: "border-warning/40 bg-warning-subtle text-warning",
  neutro: "border-border bg-muted text-muted-foreground",
};

const COR_DO_PONTO: Record<Tom, string> = {
  sucesso: "bg-success",
  informacao: "bg-primary",
  perigo: "bg-destructive",
  atencao: "bg-warning",
  neutro: "bg-muted-foreground",
};

export function PontoDeStatus({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        COR_DO_PONTO[STATUS[status].tom],
        className,
      )}
    />
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const { rotulo, tom } = STATUS[status];

  return (
    <Badge variant="outline" className={cn(CLASSES[tom], className)}>
      {rotulo}
    </Badge>
  );
}
