"use client";

import { Plus } from "lucide-react";

import { BarraDeFerramentas, type Pesquisa } from "@/components/cadastro";
import { Button } from "@/components/ui/button";

export function CabecalhoDaSecao({
  titulo,
  descricao,
  rotulo,
  onNovo,
  pesquisa,
  filtros,
}: {
  filtros?: React.ReactNode;
  titulo: string;
  descricao: string;
  rotulo: string;
  onNovo: () => void;
  pesquisa: Pesquisa;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">{titulo}</h2>
          <p className="text-muted-foreground text-sm">{descricao}</p>
        </div>
        <Button onClick={onNovo}>
          <Plus />
          {rotulo}
        </Button>
      </div>
      <BarraDeFerramentas pesquisa={pesquisa} filtros={filtros} />
    </div>
  );
}
