import type { ActivityType } from "@/domain/booking/types";

export const COR_DA_ATIVIDADE: Record<ActivityType, string> = {
  class:
    "bg-sky-100 border-sky-200 border-l-sky-600 dark:bg-sky-950 dark:border-sky-900 dark:border-l-sky-400",
  lecture:
    "bg-violet-100 border-violet-200 border-l-violet-600 dark:bg-violet-950 dark:border-violet-900 dark:border-l-violet-400",
  exam: "bg-amber-100 border-amber-200 border-l-amber-600 dark:bg-amber-950 dark:border-amber-900 dark:border-l-amber-400",
  event:
    "bg-emerald-100 border-emerald-200 border-l-emerald-600 dark:bg-emerald-950 dark:border-emerald-900 dark:border-l-emerald-400",
};

export const PONTO_DA_ATIVIDADE: Record<ActivityType, string> = {
  class: "bg-sky-600 dark:bg-sky-400",
  lecture: "bg-violet-600 dark:bg-violet-400",
  exam: "bg-amber-600 dark:bg-amber-400",
  event: "bg-emerald-600 dark:bg-emerald-400",
};

export const COR_DA_ENCERRADA = "brightness-[0.93]";

export function corDaEncerrada(fim: Date, agora: Date): string | false {
  return fim <= agora && COR_DA_ENCERRADA;
}

export const COR_DA_INSCRICAO_ABERTA =
  "border-2 border-dashed border-violet-500 bg-transparent shadow-none dark:border-violet-400";

export const COR_DA_CANCELADA =
  "bg-muted/60 border-l-muted-foreground/40 border-dashed text-muted-foreground line-through";
