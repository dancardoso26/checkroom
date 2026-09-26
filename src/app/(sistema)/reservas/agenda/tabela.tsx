"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

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
import type { BookingListItem } from "@/lib/repositories/bookingRepository";
import type { EstadoDaTabela, Ordenacao, Paginacao } from "@/lib/tabela";
import { cn } from "@/lib/utils";

import { AcoesDaReserva } from "../acoes-da-reserva";
import { ROTULO_DA_ATIVIDADE } from "../formulario/campos";

function CabecalhoOrdenavel({
  coluna,
  rotulo,
  ordenacao,
  onOrdenar,
}: {
  coluna: Ordenacao;
  rotulo: string;
  ordenacao: EstadoDaTabela;
  onOrdenar: (coluna: Ordenacao) => void;
}) {
  const ativa = ordenacao.ordenar === coluna;
  const Seta = ordenacao.sentido === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead
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
          "hover:text-foreground -mx-1 inline-flex items-center gap-1 rounded px-1",
          ativa && "text-foreground"
        )}
      >
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
  onOrdenar,
}: {
  reservas: BookingListItem[];
  paginacao: Paginacao;
  ordenacao: EstadoDaTabela;
  agora: Date;
  destaque?: string;
  onOrdenar: (coluna: Ordenacao) => void;
}) {
  const cabecalho = { ordenacao, onOrdenar };

  return (
    <div className="bg-card rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <CabecalhoOrdenavel
              coluna="atividade"
              rotulo="Atividade"
              {...cabecalho}
            />
            <CabecalhoOrdenavel coluna="data" rotulo="Data" {...cabecalho} />
            <CabecalhoOrdenavel
              coluna="espaco"
              rotulo="Espaço"
              {...cabecalho}
            />
            <CabecalhoOrdenavel
              coluna="professor"
              rotulo="Professor"
              {...cabecalho}
            />
            <CabecalhoOrdenavel coluna="turma" rotulo="Turma" {...cabecalho} />
            <CabecalhoOrdenavel
              coluna="situacao"
              rotulo="Status"
              {...cabecalho}
            />
            <TableHead className="w-10">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {reservas.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center">
                <p className="font-medium">Nenhuma reserva encontrada</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Crie uma reserva pelo botão Nova reserva.
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
                destaque === reserva.id && "bg-primary-subtle"
              )}
            >
              <TableCell>
                <p
                  className={cn(
                    "font-medium",
                    reserva.cancelled && "line-through"
                  )}
                >
                  {reserva.purpose}
                </p>
                <p className="text-muted-foreground text-xs">
                  {ROTULO_DA_ATIVIDADE[reserva.activityType]}
                  {reserva.subjectName && ` · ${reserva.subjectName}`}
                </p>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDate(reserva.startsAt)},{" "}
                {formatTimeRange(reserva.startsAt, reserva.endsAt)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {reserva.building} · {reserva.roomName}
              </TableCell>
              <TableCell>{reserva.professorName}</TableCell>
              <TableCell>{reserva.className}</TableCell>
              <TableCell>
                <StatusBadge status={statusDaReserva(reserva, agora)} />
              </TableCell>
              <TableCell>
                <AcoesDaReserva
                  bookingId={reserva.id}
                  descricao={`${reserva.purpose}, ${reserva.building} · ${reserva.roomName}`}
                  cancelada={reserva.cancelled}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {reservas.length > 0 && (
        <PaginacaoDaTabela
          pagina={paginacao.pagina}
          totalDePaginas={paginacao.totalDePaginas}
          porPagina={ordenacao.porPagina}
        />
      )}
    </div>
  );
}
