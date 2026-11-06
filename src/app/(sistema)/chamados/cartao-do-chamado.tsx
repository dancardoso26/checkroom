"use client";

import { CheckCircle2, Hand, X } from "lucide-react";

import { RotuloDeCampo } from "@/components/rotulo-de-campo";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  STATUS_DA_PRIORIDADE,
  STATUS_DA_SITUACAO,
} from "@/domain/chamados/chamado";
import { formatDateTime } from "@/lib/datetime";

import type { Linha } from "./tipos";

export function CartaoDoChamado({
  chamado,
  emFoco,
  veTodos,
  pendente,
  onDetalhe,
  onAssumir,
  onResolver,
  onCancelar,
}: {
  chamado: Linha;
  emFoco: boolean;
  veTodos: boolean;
  pendente: boolean;
  onDetalhe: () => void;
  onAssumir: () => void;
  onResolver: () => void;
  onCancelar: () => void;
}) {
  return (
    <article
      id={`chamado-${chamado.id}`}
      data-cartao-chamado={chamado.descricao}
      className={`bg-card flex flex-col gap-4 rounded-lg border p-4 ${emFoco ? "ring-primary ring-2" : ""}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="font-semibold">{chamado.espaco}</h2>
          <p className="text-muted-foreground text-xs">
            {formatDateTime(chamado.abertoEm)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <StatusBadge status={STATUS_DA_SITUACAO[chamado.situacao]} />
          <StatusBadge status={STATUS_DA_PRIORIDADE[chamado.prioridade]} />
        </div>
      </header>

      <p className="line-clamp-3 text-sm">{chamado.descricao}</p>

      {(veTodos || chamado.responsavelNome) && (
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          {veTodos && (
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs">
                <RotuloDeCampo rotulo="Solicitante" />
              </dt>
              <dd>{chamado.solicitanteNome}</dd>
            </div>
          )}
          {chamado.responsavelNome && (
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs">
                <RotuloDeCampo rotulo="Responsável" />
              </dt>
              <dd>{chamado.responsavelNome}</dd>
            </div>
          )}
        </dl>
      )}

      <footer className="mt-auto flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDetalhe}>
          Detalhes
        </Button>
        {chamado.acoes.includes("cancelar") && (
          <Button size="sm" variant="outline" onClick={onCancelar}>
            <X />
            Cancelar
          </Button>
        )}
        {chamado.acoes.includes("assumir") && (
          <Button size="sm" disabled={pendente} onClick={onAssumir}>
            <Hand />
            Assumir
          </Button>
        )}
        {chamado.acoes.includes("resolver") && (
          <Button size="sm" onClick={onResolver}>
            <CheckCircle2 />
            Resolver
          </Button>
        )}
      </footer>
    </article>
  );
}
