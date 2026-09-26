import { Badge } from "@/components/ui/badge";
import { STATUS, type Status, type Tom } from "@/domain/status/status";
import { cn } from "@/lib/utils";

const CLASSES: Record<Tom, string> = {
  sucesso: "border-success/30 bg-success-subtle text-success",
  informacao: "border-primary/30 bg-primary-subtle text-primary",
  perigo: "border-destructive/30 bg-destructive-subtle text-destructive",
};

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
