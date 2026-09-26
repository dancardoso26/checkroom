"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import {
  periodoVizinho,
  sugerirTermino,
  type Escala,
  type Visao,
} from "@/lib/calendario";
import type { Filtros } from "@/lib/filtros";
import type { BookingListItem } from "@/lib/repositories/bookingRepository";
import {
  alternarOrdenacao,
  type Ordenacao,
  type Paginacao,
} from "@/lib/tabela";

import { CancelarReserva } from "../cancelar-reserva";
import { ExcluirReserva } from "../excluir-reserva";
import {
  PainelDeReserva,
  type Catalogos,
} from "../formulario/painel-de-reserva";
import { BarraDaAgenda } from "./barra-da-agenda";
import type { OpcaoDeProfessor } from "./filtros-da-agenda";
import { CalendarioGrade, type Rascunho } from "./calendario-grade";
import { CalendarioMes } from "./calendario-mes";
import { DetalheDaReserva } from "./detalhe-da-reserva";
import { Tabela } from "./tabela";
import { hrefDaAgenda, type EstadoDaAgenda } from "./url";

export type Painel = {
  catalogos: Catalogos;
  professorFixo: string | null;
  dia: string;
  inicio?: string;
  fim?: string;
};

export type PaginaDaTabela = {
  reservas: BookingListItem[];
  total: number;
  paginacao: Paginacao;
};

function descreverReserva(reserva: BookingListItem): string {
  return `${reserva.purpose}, ${reserva.building} · ${reserva.roomName}`;
}

export function Agenda({
  estado,
  titulo,
  dias,
  hoje,
  agora,
  reservas,
  tabela,
  destaque,
  painel,
  professores,
}: {
  estado: EstadoDaAgenda;
  titulo: string;
  dias: string[];
  hoje: string;
  agora: Date;
  reservas: BookingListItem[];
  tabela: PaginaDaTabela | null;
  destaque?: string;
  painel: Painel | null;
  professores: OpcaoDeProfessor[];
}) {
  const router = useRouter();
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [confirmacao, setConfirmacao] = useState<{
    tipo: "cancelar" | "excluir";
    reserva: BookingListItem;
  } | null>(null);

  // Derivada da lista, e não guardada: depois de cancelar ou excluir pelo
  // detalhe, a lista recarrega e o detalhe reflete o novo estado, ou fecha.
  const reservaAberta = reservas.find((r) => r.id === selecionada) ?? null;

  const ir = useCallback(
    (mudancas: Partial<EstadoDaAgenda>, extras = {}) =>
      router.push(hrefDaAgenda({ ...estado, ...mudancas }, extras), {
        scroll: false,
      }),
    [router, estado]
  );

  const onEscala = useCallback((escala: Escala) => ir({ escala }), [ir]);
  const onVisao = useCallback((visao: Visao) => ir({ visao }), [ir]);
  const onHoje = useCallback(() => ir({ data: hoje }), [ir, hoje]);
  // Filtro novo muda o total de páginas, então a tabela volta à primeira.
  const onFiltros = useCallback(
    (filtros: Filtros) =>
      ir({ filtros, tabela: { ...estado.tabela, pagina: 1 } }),
    [ir, estado.tabela]
  );
  const onNavegar = useCallback(
    (direcao: 1 | -1) =>
      ir({ data: periodoVizinho(estado.escala, estado.data, direcao) }),
    [ir, estado.escala, estado.data]
  );

  // Sem horário escolhido, a reserva nova parte de hoje, ou do período em
  // exibição se ele estiver no futuro: nunca de um dia que já passou.
  const onNova = useCallback(
    () =>
      ir(
        {},
        {
          nova: true,
          dia: dias.includes(hoje) || dias[0] < hoje ? hoje : dias[0],
        }
      ),
    [ir, dias, hoje]
  );

  const onEscolherHorario = useCallback(
    (dia: string, inicio: string, fim?: string) =>
      ir({}, { nova: true, dia, inicio, fim }),
    [ir]
  );

  const onOrdenar = useCallback(
    (coluna: Ordenacao) =>
      ir({ tabela: alternarOrdenacao(estado.tabela, coluna) }),
    [ir, estado.tabela]
  );

  const onFechar = useCallback(() => ir({}), [ir]);

  const onConcluir = useCallback(
    (bookingId: string, dia: string) =>
      ir({ data: dia }, { destaque: bookingId }),
    [ir]
  );

  return (
    <div className="space-y-3">
      <BarraDaAgenda
        estado={estado}
        titulo={titulo}
        total={tabela?.total}
        onEscala={onEscala}
        onVisao={onVisao}
        onNavegar={onNavegar}
        onHoje={onHoje}
        onFiltros={onFiltros}
        professores={professores}
        onNova={onNova}
      />

      {estado.visao === "calendario" && estado.escala !== "mes" && (
        <CalendarioGrade
          dias={dias}
          hoje={hoje}
          agora={agora}
          reservas={reservas}
          destaque={destaque}
          // Só com o painel aberto: ao fechar, o último rascunho não fica na grade.
          rascunho={painel ? rascunho : null}
          onEscolherHorario={onEscolherHorario}
          onAbrirReserva={setSelecionada}
        />
      )}

      {estado.visao === "calendario" && estado.escala === "mes" && (
        <CalendarioMes
          dias={dias}
          referencia={estado.data}
          hoje={hoje}
          reservas={reservas}
          destaque={destaque}
          onEscolherDia={(dia) => ir({}, { nova: true, dia })}
          onAbrirDia={(dia) => ir({ escala: "dia", data: dia })}
          onAbrirReserva={setSelecionada}
        />
      )}

      {tabela && (
        <Tabela
          reservas={tabela.reservas}
          paginacao={tabela.paginacao}
          ordenacao={estado.tabela}
          agora={agora}
          destaque={destaque}
          onOrdenar={onOrdenar}
        />
      )}

      {reservaAberta && (
        <DetalheDaReserva
          reserva={reservaAberta}
          agora={agora}
          onFechar={() => setSelecionada(null)}
          onCancelar={() => {
            setSelecionada(null);
            setConfirmacao({ tipo: "cancelar", reserva: reservaAberta });
          }}
          onExcluir={() => {
            setSelecionada(null);
            setConfirmacao({ tipo: "excluir", reserva: reservaAberta });
          }}
        />
      )}

      {/* A chave recomeça a confirmação a cada reserva, sem erro da anterior. */}
      {confirmacao?.tipo === "cancelar" && (
        <CancelarReserva
          key={confirmacao.reserva.id}
          bookingId={confirmacao.reserva.id}
          descricao={descreverReserva(confirmacao.reserva)}
          aberto
          onAbertoChange={(aberto) => !aberto && setConfirmacao(null)}
        />
      )}

      {confirmacao?.tipo === "excluir" && (
        <ExcluirReserva
          key={confirmacao.reserva.id}
          bookingId={confirmacao.reserva.id}
          descricao={descreverReserva(confirmacao.reserva)}
          cancelada={confirmacao.reserva.cancelled}
          aberto
          onAbertoChange={(aberto) => !aberto && setConfirmacao(null)}
        />
      )}

      {painel && (
        <PainelDeReserva
          // A chave reinicia o formulário quando outro horário é escolhido com
          // o painel aberto, em vez de manter os campos da escolha anterior.
          key={`${painel.dia}-${painel.inicio ?? ""}-${painel.fim ?? ""}`}
          catalogos={painel.catalogos}
          hoje={hoje}
          professorFixo={painel.professorFixo}
          preenchimento={{
            date: painel.dia,
            startTime: painel.inicio,
            endTime:
              painel.fim ??
              (painel.inicio ? sugerirTermino(painel.inicio) : undefined),
          }}
          onFechar={onFechar}
          onConcluir={onConcluir}
          onRascunho={setRascunho}
        />
      )}
    </div>
  );
}
