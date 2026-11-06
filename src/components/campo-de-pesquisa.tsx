"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CampoDePesquisa({
  valor,
  onMudar,
  rotulo,
  className,
}: {
  valor: string;
  onMudar: (valor: string) => void;
  rotulo: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:w-64", className)}>
      <Search
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
      />
      <Input
        type="search"
        aria-label={rotulo}
        placeholder="Pesquisar"
        value={valor}
        onChange={(evento) => onMudar(evento.target.value)}
        className="pl-8"
      />
    </div>
  );
}
