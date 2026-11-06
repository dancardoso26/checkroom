import { cn } from "@/lib/utils";

export function BarraDeOcupacao({
  ocupadas,
  total,
  rotulo,
  className,
}: {
  ocupadas: number;
  total: number;
  rotulo: string;
  className?: string;
}) {
  const proporcao = total > 0 ? Math.min(ocupadas / total, 1) : 0;

  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(ocupadas, total)}
      className={cn(
        "bg-muted h-1.5 w-full overflow-hidden rounded-full",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          proporcao >= 1
            ? "bg-destructive"
            : proporcao >= 0.8
              ? "bg-warning"
              : "bg-primary",
        )}
        style={{ width: `${proporcao * 100}%` }}
      />
    </div>
  );
}
