import type { ActivityType } from "@/domain/booking/types";

// Fundo claro com texto no tom do primeiro plano: o contraste fica acima do AA
// em todas, e é a borda esquerda que carrega a cor forte que distingue o tipo.
export const COR_DA_ATIVIDADE: Record<ActivityType, string> = {
  class: "bg-primary-subtle border-l-primary",
  lecture: "bg-success-subtle border-l-success",
  exam: "bg-warning-subtle border-l-warning",
  defense: "bg-secondary border-l-foreground/60",
  event: "bg-card border-l-muted-foreground",
};

export const COR_DA_CANCELADA =
  "bg-muted/60 border-l-muted-foreground/40 border-dashed text-muted-foreground line-through";
