import { ICONE_DO_CAMPO } from "@/lib/campos-padrao";
import { cn } from "@/lib/utils";

export function RotuloDeCampo({
  rotulo,
  className,
}: {
  rotulo: string;
  className?: string;
}) {
  const Icone = ICONE_DO_CAMPO[rotulo];

  if (!Icone) return <>{rotulo}</>;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Icone aria-hidden className="text-muted-foreground size-4 shrink-0" />
      {rotulo}
    </span>
  );
}
