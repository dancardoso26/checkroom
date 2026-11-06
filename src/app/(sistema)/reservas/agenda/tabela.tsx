"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CircleDot,
  DoorOpen,
  Shapes,
  Tag,
  Trash2,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  BarraDeSelecao,
  CabecalhoDaSelecao,
  CelulaDaSelecao,
} from "@/components/cadastro";
import { ConfirmarExclusao } from "@/components/formulario";
import { useSelecao } from "@/hooks/use-tabela";

import { Paginacao as PaginacaoDaTabela } from "@/components/paginacao";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { statusDaReserva } from "@/domain/status/status";
import { formatDate, formatTimeRange } from "@/lib/datetime";
import type { BookingListItem } from "@/lib/repositories/repositorio-de-reservas";
import type { EstadoDaTabela, Ordenacao, Paginacao } from "@/domain/tabela/tabela";
import { cn } from "@/lib/utils";

import { AcoesDaReserva } from "./acoes-da-reserva";
import { PONTO_DA_ATIVIDADE } from "./estilo";
import { CancelarEmLote, excluirReservasEmLote } from "./acoes-em-lote";
import { ROTULO_DA_ATIVIDADE } from "../formulario/campos";

function CabecalhoOrdenavel({
  coluna,
  rotulo,
  icone: Icone,
  ordenacao,
  onOrdenar,
  className,
}: {
  coluna: Ordenacao;
  rotulo: string;
  icone: LucideIcon;
  ordenacao: EstadoDaTabela;
  onOrdenar: (coluna: Ordenacao) => void;
  className?: string;
}) {
  const ativa = ordenacao.ordenar === coluna;
  const Seta = ordenacao.sentido === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead
      className={className}
      aria-sort={
        ativa
          ? ordenacao.sentido === "asc"
            ? "ascending"
            : "descending"
          : undefined
      }
    >
      <button
        type="button"
        onClick={() => onOrdenar(coluna)}
        className={cn(
          "hover:text-foreground -mx-1 inline-flex items-center gap-1.5 rounded px-1",
          ativa && "text-foreground",
        )}
      >
        <Icone aria-hidden className="text-muted-foreground size-4 shrink-0" />
        {rotulo}
        {ativa && <Seta aria-hidden className="size-3.5" />}
      </button>
    </TableHead>
  );
}

export function Tabela({
  reservas,
  paginacao,
  ordenacao,
  agora,
  destaque,
  pesquisando = false,
  total,
  onOrdenar,
  selecionavel,
}: {
  reservas: BookingListItem[];
  paginacao: Paginacao;
  ordenacao: EstadoDaTabela;
  agora: Date;
  destaque?: string;
  pesquisando?: boolean;
  total?: number;
  onOrdenar: (coluna: Ordenacao) => void;
  selecionavel: boolean;
}) {
  const cabecalho = { ordenacao, onOrdenar };

  const gerenciaveis = reservas.filter((r) => r.gerenciavel);
  const selecao = useSelecao(
    gerenciaveis.map((r) => r.id),
    gerenciaveis.map((r) => r.id),
  );
  const marcadas = gerenciaveis.filter((r) => selecao.estaMarcado(r.id));
  const aCancelar = marcadas.filter((r) => !r.cancelled);
  const [emLote, setEmLote] = useState<"cancelar" | "excluir" | null>(null);

  return (
    <div className="bg-card rounded-lg border">
      <BarraDeSelecao
        quantidade={marcadas.length}
        singular="reserva"
        plural="reservas"
        onLimpar={selecao.limpar}
        acoes={[
          ...(aCancelar.length > 0
            ? [
                {
                  rotulo: `Cancelar (${aCancelar.length})`,
                  icone: X,
                  onExecutar: () => setEmLote("cancelar"),
                },
              ]
            : []),
          {
            rotulo: "Excluir",
            icone: Trash2,
            destrutiva: true,
            onExecutar: () => setEmLote("excluir"),
          },
        ]}
      />
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            {selecionavel && <CabecalhoDaSelecao selecao={selecao} />}
            <CabecalhoOrdenavel
              coluna="atividade"
              rotulo="Atividade"
              icone={Tag}
              {...cabecalho}
            />
            <CabecalhoOrdenavel
              coluna="tipo"
              className="w-[10%]"
              rotulo="Tipo"
              icone={Shapes}
              {...cabecalho}
            />
            <CabecalhoOrdenavel
              coluna="data"
              className="w-[14%]"
              rotulo="Data e hora"
              icone={CalendarClock}
              {...cabecalho}
            />
            <CabecalhoOrdenavel
              coluna="espaco"
              className="w-[9%]"
              rotulo="Espaço"
              icone={DoorOpen}
              {...cabecalho}
            />
            <CabecalhoOrdenavel
              coluna="professor"
              className="w-[13%]"
              rotulo="Professor"
              icone={UserRound}
              {...cabecalho}
            />
            <CabecalhoOrdenavel
              coluna="turma"
              className="w-[13%]"
              rotulo="Turma"
              icone={Users}
              {...cabecalho}
            />
            <CabecalhoOrdenavel
              coluna="situacao"
              className="w-[11%]"
              rotulo="Status"
              icone={CircleDot}
              {...cabecalho}
            />
            {selecionavel && (
              <TableHead className="w-[72px]">
                <span className="sr-only">Ações</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {reservas.length === 0 && (
            <TableRow>
              <TableCell colSpan={selecionavel ? 9 : 7} className="py-10 text-center">
                <p className="font-medium">
                  {pesquisando
                    ? "Nenhuma reserva corresponde à pesquisa"
                    : "Nenhuma reserva encontrada"}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {pesquisando
                    ? "Confira o texto pesquisado ou limpe a pesquisa."
                    : "Crie uma reserva pelo botão Nova reserva."}
                </p>
              </TableCell>
            </TableRow>
          )}

          {reservas.map((reserva) => (
            <TableRow
              key={reserva.id}
              data-reserva={reserva.id}
              className={cn(
                reserva.cancelled && "text-muted-foreground",
                destaque === reserva.id && "bg-primary-subtle",
              )}
            >
              {selecionavel && (
                <CelulaDaSelecao
                  selecao={selecao}
                  id={reserva.id}
                  descricao={`${reserva.purpose}, ${reserva.roomName}`}
                  desabilitada={!reserva.gerenciavel}
                />
              )}
              <TableCell>
                <p
                  className={cn(
                    "font-medium",
                    reserva.cancelled && "line-through",
                  )}
                >
                  {reserva.purpose}
                </p>
                {reserva.subjectName && (
                  <p className="text-muted-foreground text-xs">
                    {reserva.subjectName}
                  </p>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      PONTO_DA_ATIVIDADE[reserva.activityType],
                    )}
                  />
                  {ROTULO_DA_ATIVIDADE[reserva.activityType]}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDate(reserva.startsAt)},{" "}
                {formatTimeRange(reserva.startsAt, reserva.endsAt)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {reserva.roomName}
              </TableCell>
              <TableCell>{reserva.professorName}</TableCell>
              <TableCell>{reserva.className}</TableCell>
              <TableCell>
                <StatusBadge status={statusDaReserva(reserva, agora)} />
              </TableCell>
              {selecionavel && (
                <TableCell>
                  {reserva.gerenciavel && (
                    <AcoesDaReserva
                      bookingId={reserva.id}
                      descricao={`${reserva.purpose}, ${reserva.roomName}`}
                      cancelada={reserva.cancelled}
                    />
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <PaginacaoDaTabela
        pagina={paginacao.pagina}
        totalDePaginas={paginacao.totalDePaginas}
        porPagina={ordenacao.porPagina}
        total={total}
      />

      {emLote === "cancelar" && (
        <CancelarEmLote
          reservas={aCancelar}
          onFechar={(concluido) => {
            setEmLote(null);
            if (concluido) selecao.limpar();
          }}
        />
      )}

      {emLote === "excluir" && (
        <ConfirmarExclusao
          titulo={`Excluir ${marcadas.length} ${marcadas.length === 1 ? "reserva" : "reservas"} permanentemente?`}
          descricao={marcadas
            .map((r) => `${r.purpose}, ${r.roomName}`)
            .join("; ")}
          aviso="A exclusão não pode ser desfeita. Para manter o histórico, prefira cancelar."
          acao={() => excluirReservasEmLote(marcadas)}
          onFechar={() => setEmLote(null)}
        />
      )}
    </div>
  );
}
