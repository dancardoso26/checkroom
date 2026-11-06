"use client";

import { Trash2, UsersRound, X } from "lucide-react";

import { BarraDeOcupacao } from "@/components/barra-de-ocupacao";
import {
  CelulaDaSelecao,
  MenuDeAcoes,
} from "@/components/cadastro";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatPeriod } from "@/lib/datetime";
import type { Selecao } from "@/hooks/use-tabela";

import { cancelarInscricao, inscreverEmPalestra } from "./acoes";
import { statusDaPalestra, type Palestra } from "./palestra-na-lista";

export function LinhaDaPalestra({
  palestra,
  selecao,
  selecionavel,
  cadastra,
  pendente,
  onExecutar,
  onInscritos,
  onExcluir,
}: {
  palestra: Palestra;
  selecao: Selecao;
  selecionavel: boolean;
  cadastra: boolean;
  pendente: boolean;
  onExecutar: (
    acao: () => Promise<{ ok: boolean; mensagem?: string }>,
    sucesso: string,
  ) => void;
  onInscritos: () => void;
  onExcluir: () => void;
}) {
  return (
    <TableRow data-palestra={palestra.titulo}>
      <CelulaDaSelecao
        selecao={selecao}
        id={palestra.id}
        descricao={palestra.titulo}
        desabilitada={!selecionavel}
      />
      <TableCell className="max-w-sm whitespace-normal">
        <span className="font-medium">{palestra.titulo}</span>
        <span className="text-muted-foreground block text-xs">
          {palestra.cursos.join(", ")}
        </span>
      </TableCell>
      <TableCell>{palestra.palestrante}</TableCell>
      <TableCell className="whitespace-nowrap">
        {formatPeriod(palestra.inicio, palestra.fim)}
      </TableCell>
      <TableCell className="whitespace-nowrap">{palestra.espaco}</TableCell>
      <TableCell className="min-w-52 whitespace-nowrap">
        {palestra.inscritos} de {palestra.vagas} inscritos
        <BarraDeOcupacao
          ocupadas={palestra.inscritos}
          total={palestra.vagas}
          rotulo={`${palestra.inscritos} de ${palestra.vagas} vagas ocupadas`}
          className="mt-1.5"
        />
      </TableCell>
      <TableCell>
        <StatusBadge status={statusDaPalestra(palestra)} />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {palestra.situacaoDoAluno === "disponivel" && (
            <Button
              size="sm"
              disabled={pendente}
              onClick={() =>
                onExecutar(
                  () => inscreverEmPalestra(palestra.id),
                  "Inscrição realizada.",
                )
              }
            >
              Inscrever-se
            </Button>
          )}
          {cadastra && (
            <Button size="sm" variant="outline" onClick={onInscritos}>
              <UsersRound />
              Inscritos
            </Button>
          )}
          <MenuDeAcoes
            descricao={palestra.titulo}
            acoes={[
              ...(palestra.situacaoDoAluno === "inscrito" && !palestra.iniciada
                ? [
                    {
                      rotulo: "Cancelar inscrição",
                      icone: X,
                      destrutiva: true,
                      desabilitada: pendente,
                      onSelect: () =>
                        onExecutar(
                          () => cancelarInscricao(palestra.id),
                          "Inscrição cancelada.",
                        ),
                    },
                  ]
                : []),
              ...(cadastra
                ? [
                    {
                      rotulo: "Excluir",
                      icone: Trash2,
                      destrutiva: true,
                      onSelect: onExcluir,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
