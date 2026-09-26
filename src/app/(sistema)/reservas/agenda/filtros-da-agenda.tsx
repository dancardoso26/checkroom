"use client";

import { useState } from "react";
import { ListFilter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  caixasDoStatus,
  contarFiltrosAtivos,
  FILTROS_PADRAO,
  statusDasCaixas,
  type Filtros,
} from "@/lib/filtros";

export type OpcaoDeProfessor = { id: string; nome: string };

// O Select do Radix não aceita valor vazio num item, então "todos" é o sentinela.
const TODOS = "todos";

export function FiltrosDaAgenda({
  filtros,
  professores,
  onAplicar,
}: {
  filtros: Filtros;
  professores: OpcaoDeProfessor[];
  onAplicar: (filtros: Filtros) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState(filtros);
  const ativos = contarFiltrosAtivos(filtros);
  const caixas = caixasDoStatus(rascunho.status);

  // O rascunho recomeça do que está aplicado a cada abertura: fechar sem
  // aplicar descarta o que foi mexido.
  function alternar(abrir: boolean) {
    if (abrir) setRascunho(filtros);
    setAberto(abrir);
  }

  function marcar(caixa: "agendadas" | "canceladas", marcada: boolean) {
    setRascunho({
      ...rascunho,
      status: statusDasCaixas({ ...caixas, [caixa]: marcada }),
    });
  }

  function aplicar(novos: Filtros) {
    onAplicar(novos);
    setAberto(false);
  }

  return (
    <>
      <Button
        variant={ativos > 0 ? "secondary" : "ghost"}
        size="sm"
        onClick={() => alternar(true)}
      >
        <ListFilter />
        Filtros
        {ativos > 0 && (
          <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
            {ativos}
          </span>
        )}
      </Button>

      <Sheet open={aberto} onOpenChange={alternar}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription className="sr-only">
              Filtrar reservas por professor e status.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-4">
            <div className="space-y-2">
              <Label htmlFor="filtroProfessor">Professor</Label>
              <Select
                value={rascunho.professor ?? TODOS}
                onValueChange={(v) =>
                  setRascunho({
                    ...rascunho,
                    professor: v === TODOS ? null : v,
                  })
                }
              >
                <SelectTrigger id="filtroProfessor" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos os professores</SelectItem>
                  {professores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-medium">Status</legend>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filtroAgendadas"
                  checked={caixas.agendadas}
                  onCheckedChange={(v) => marcar("agendadas", v === true)}
                />
                <Label htmlFor="filtroAgendadas" className="font-normal">
                  Agendada
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filtroCanceladas"
                  checked={caixas.canceladas}
                  onCheckedChange={(v) => marcar("canceladas", v === true)}
                />
                <Label htmlFor="filtroCanceladas" className="font-normal">
                  Cancelada
                </Label>
              </div>
            </fieldset>
          </div>

          <SheetFooter className="flex-row justify-end">
            <Button variant="ghost" onClick={() => aplicar(FILTROS_PADRAO)}>
              Limpar
            </Button>
            <Button onClick={() => aplicar(rascunho)}>Aplicar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
