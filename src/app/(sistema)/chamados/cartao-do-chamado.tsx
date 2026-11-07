"use client";

import { CheckCircle2, Hand, Undo2, X } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { STATUS_DA_PRIORIDADE } from "@/domain/chamados/chamado";
import { formatDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

import type { Linha } from "./tipos";

const BOTAO = "h-7 px-2.5 text-xs";

export function CartaoDoChamado({
  chamado,
  emFoco,
  veTodos,
  pendente,
  onDetalhe,
  onAssumir,
  onDevolver,
  onResolver,
  onCancelar,
}: {
  chamado: Linha;
  emFoco: boolean;
  veTodos: boolean;
  pendente: boolean;
  onDetalhe: () => void;
  onAssumir: () => void;
  onDevolver: () => void;
  onResolver: () => void;
  onCancelar: () => void;
}) {
  const pessoas = [
    veTodos ? `Por ${chamado.solicitanteNome}` : null,
    chamado.responsavelNome ? `Com ${chamado.responsavelNome}` : null,
  ].filter(Boolean);

  return (
    <article
      id={`chamado-${chamado.id}`}
      data-cartao-chamado={chamado.descricao}
      className={cn(
        "bg-card space-y-2 rounded-md border p-3 shadow-xs",
        emFoco && "ring-primary ring-2",
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm leading-tight font-semibold">
            {chamado.espaco}
          </h3>
          <p className="text-muted-foreground text-xs">
            {formatDateTime(chamado.abertoEm)}
          </p>
        </div>
        <StatusBadge status={STATUS_DA_PRIORIDADE[chamado.prioridade]} />
      </header>

      <p className="line-clamp-2 text-sm">{chamado.descricao}</p>

      {pessoas.length > 0 && (
        <p className="text-muted-foreground truncate text-xs">
          {pessoas.join(" · ")}
        </p>
      )}

      <footer className="flex flex-wrap items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className={cn(BOTAO, "-ml-2.5 mr-auto")}
          onClick={onDetalhe}
        >
          Detalhes
        </Button>
        {chamado.acoes.includes("cancelar") && (
          <Button
            size="sm"
            variant="outline"
            className={BOTAO}
            onClick={onCancelar}
          >
            <X />
            Cancelar
          </Button>
        )}
        {chamado.acoes.includes("assumir") && (
          <Button
            size="sm"
            className={BOTAO}
            disabled={pendente}
            onClick={onAssumir}
          >
            <Hand />
            Assumir
          </Button>
        )}
        {chamado.acoes.includes("devolver") && (
          <Button
            size="sm"
            variant="outline"
            className={BOTAO}
            disabled={pendente}
            onClick={onDevolver}
          >
            <Undo2 />
            Devolver
          </Button>
        )}
        {chamado.acoes.includes("resolver") && (
          <Button size="sm" className={BOTAO} onClick={onResolver}>
            <CheckCircle2 />
            Resolver
          </Button>
        )}
      </footer>
    </article>
  );
}
