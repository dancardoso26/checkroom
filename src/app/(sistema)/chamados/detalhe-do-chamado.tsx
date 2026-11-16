"use client";

import { RotuloDeCampo } from "@/components/rotulo-de-campo";
import { SeloDeSituacao } from "@/components/selo-de-situacao";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  STATUS_DA_PRIORIDADE,
  STATUS_DA_SITUACAO,
} from "@/domain/chamados/chamado";
import { formatarDataEHora } from "@/lib/datas";

import type { Linha } from "./tipos";

export function DetalheDoChamado({
  chamado,
  onFechar,
}: {
  chamado: Linha;
  onFechar: () => void;
}) {
  const linhas: [string, string | null, boolean?][] = [
    ["Problema", chamado.descricao, true],
    ["Solicitante", chamado.solicitanteNome],
    ["Criado em", formatarDataEHora(chamado.abertoEm)],
    [
      "Atendimento iniciado em",
      chamado.iniciadoEm && formatarDataEHora(chamado.iniciadoEm),
    ],
    [
      "Resolvido em",
      chamado.resolvidoEm && formatarDataEHora(chamado.resolvidoEm),
    ],
    [
      "Cancelado em",
      chamado.canceladoEm && formatarDataEHora(chamado.canceladoEm),
    ],
    ["Responsável", chamado.responsavelNome],
    ["Solução", chamado.nota, true],
  ];

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{chamado.espaco}</DialogTitle>
          <DialogDescription className="flex gap-2">
            <SeloDeSituacao status={STATUS_DA_SITUACAO[chamado.situacao]} />
            <SeloDeSituacao status={STATUS_DA_PRIORIDADE[chamado.prioridade]} />
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          {linhas
            .filter(([, valor]) => valor)
            .map(([termo, valor, inteira]) => (
              <div key={termo} className={inteira ? "col-span-2" : undefined}>
                <dt className="text-muted-foreground text-xs">
                  <RotuloDeCampo rotulo={termo} />
                </dt>
                <dd className="whitespace-pre-wrap">{valor}</dd>
              </div>
            ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
