"use client";

import type { ActivityType } from "@/domain/booking/types";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { cn } from "@/lib/utils";

import {
  periodoVizinho,
  sugerirTermino,
  type Escala,
  type Visao,
} from "@/domain/agenda/navegacao-da-agenda";
import type { Filtros } from "@/domain/agenda/filtros-da-agenda";
import type { BookingListItem } from "@/lib/repositories/repositorio-de-reservas";
import {
  alternarOrdenacao,
  type Ordenacao,
  type Paginacao,
} from "@/domain/tabela/tabela";

import { ConfirmarExclusao } from "@/components/formulario";
import { excluirPalestra } from "../../palestras/acoes";
import { CancelarReserva } from "./cancelar-reserva";
import { ExcluirReserva } from "./excluir-reserva";
import {
  PainelDeReserva,
  type Catalogos,
} from "../formulario/painel-de-reserva";
import { BarraDaAgenda } from "./barra-da-agenda";
import type { OpcaoDeProfessor } from "./filtros-da-agenda";
import { CalendarioGrade, type Rascunho } from "./calendario-grade";
import { CalendarioMes } from "./calendario-mes";
import { DetalheDaReserva } from "./detalhe-da-reserva";
import type { ParDeDocencia } from "@/lib/repositories/repositorio-de-disciplinas";

import { MenuLateral } from "./menu-lateral";
import { Tabela } from "./tabela";
import { hrefDaAgenda, type EstadoDaAgenda } from "./url";

export type Painel = {
  catalogos: Catalogos;
  professorFixo: string | null;
  permitePalestra: boolean;
};

export type NovaReserva = {
  dia: string;
  inicio?: string;
  fim?: string;
  tipo?: ActivityType;
};

export type PaginaDaTabela = {
  reservas: BookingListItem[];
  total: number;
  paginacao: Paginacao;
};

function descreverReserva(reserva: BookingListItem): string {
  return `${reserva.purpose}, ${reserva.roomName}`;
}

export function Agenda({
  estado,
  titulo,
  dias,
  hoje,
  agora,
  reservas,
  proximos,
  tabela,
  destaque,
  painel,
  novaInicial,
  professores,
  turmas,
  espacos,
  podeReservar,
  vePalestras,
  tituloDaPagina,
  docencia,
}: {
  estado: EstadoDaAgenda;
  titulo: string;
  dias: string[];
  hoje: string;
  agora: Date;
  reservas: BookingListItem[];
  proximos: BookingListItem[];
  tabela: PaginaDaTabela | null;
  destaque?: string;
  painel: Painel | null;
  novaInicial: NovaReserva | null;
  professores: OpcaoDeProfessor[];
  turmas: OpcaoDeProfessor[];
  espacos: OpcaoDeProfessor[];
  podeReservar: boolean;
  vePalestras: boolean;
  tituloDaPagina: string;
  docencia: ParDeDocencia[];
}) {
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(true);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [novaReserva, setNovaReserva] = useState<NovaReserva | null>(
    novaInicial,
  );
  const [confirmacao, setConfirmacao] = useState<{
    tipo: "cancelar" | "excluir" | "palestra";
    reserva: BookingListItem;
  } | null>(null);

  const reservaAberta =
    reservas.find((r) => r.id === selecionada) ??
    proximos.find((r) => r.id === selecionada) ??
    null;

  const alternarMenu = useCallback(
    () => setMenuAberto((aberto) => !aberto),
    [],
  );

  const [navegando, iniciarNavegacao] = useTransition();

  const ir = useCallback(
    (mudancas: Partial<EstadoDaAgenda>, extras = {}) =>
      iniciarNavegacao(() =>
        router.push(hrefDaAgenda({ ...estado, ...mudancas }, extras), {
          scroll: false,
        }),
      ),
    [router, estado],
  );

  const onEscala = useCallback((escala: Escala) => ir({ escala }), [ir]);
  const onVisao = useCallback((visao: Visao) => ir({ visao }), [ir]);
  const onHoje = useCallback(() => ir({ data: hoje }), [ir, hoje]);
  const onFiltros = useCallback(
    (filtros: Filtros) =>
      ir({ filtros, tabela: { ...estado.tabela, pagina: 1 } }),
    [ir, estado.tabela],
  );
  const onBusca = useCallback(
    (busca: string) =>
      router.replace(
        hrefDaAgenda({
          ...estado,
          busca,
          tabela: { ...estado.tabela, pagina: 1 },
        }),
        { scroll: false },
      ),
    [router, estado],
  );

  const onNavegar = useCallback(
    (direcao: 1 | -1) =>
      ir({ data: periodoVizinho(estado.escala, estado.data, direcao) }),
    [ir, estado.escala, estado.data],
  );

  const abrirNovaReserva = useCallback(
    (nova: NovaReserva) => {
      const dia = nova.dia < hoje ? hoje : nova.dia;
      setNovaReserva({ ...nova, dia });
      if (nova.inicio && nova.fim) {
        setRascunho({ dia, inicio: nova.inicio, fim: nova.fim, titulo: "" });
      }
      window.history.replaceState(
        null,
        "",
        hrefDaAgenda(estado, { nova: true, ...nova, dia }),
      );
    },
    [estado, hoje],
  );

  const onNova = useCallback(
    () =>
      abrirNovaReserva({
        dia: dias.includes(hoje) || dias[0] < hoje ? hoje : dias[0],
      }),
    [abrirNovaReserva, dias, hoje],
  );

  const onEscolherHorario = useCallback(
    (dia: string, inicio: string, fim?: string) =>
      abrirNovaReserva({ dia, inicio, fim }),
    [abrirNovaReserva],
  );

  const onOrdenar = useCallback(
    (coluna: Ordenacao) =>
      ir({ tabela: alternarOrdenacao(estado.tabela, coluna) }),
    [ir, estado.tabela],
  );

  const onFechar = useCallback(() => {
    setNovaReserva(null);
    setRascunho(null);
    window.history.replaceState(null, "", hrefDaAgenda(estado));
  }, [estado]);

  const onConcluir = useCallback(
    (bookingId: string | null, dia: string) => {
      setNovaReserva(null);
      setRascunho(null);
      ir({ data: dia }, bookingId ? { destaque: bookingId } : undefined);
    },
    [ir],
  );

  return (
    <>
      <div className="flex items-stretch gap-3">
        {estado.visao === "calendario" && menuAberto && (
          <MenuLateral
            key={estado.data.slice(0, 7)}
            estado={estado}
            hoje={hoje}
            agora={agora}
            proximos={proximos}
            onEscolherDia={(dia) => ir({ data: dia })}
            onAbrirReserva={setSelecionada}
          />
        )}

        <div className="min-w-0 flex-1 space-y-3">
          <BarraDaAgenda
            estado={estado}
            titulo={titulo}
            onEscala={onEscala}
            onVisao={onVisao}
            onNavegar={onNavegar}
            onHoje={onHoje}
            onFiltros={onFiltros}
            professores={professores}
            turmas={turmas}
            espacos={espacos}
            onBusca={onBusca}
            onNova={podeReservar ? onNova : undefined}
            menuAberto={menuAberto}
            onMenu={alternarMenu}
            tituloDaPagina={tituloDaPagina}
            docencia={docencia}
          />

          <div
            aria-busy={navegando}
            className={cn(
              "space-y-3 transition-opacity",
              navegando && "opacity-50 delay-150 duration-200",
            )}
          >
          {estado.visao === "calendario" && estado.escala !== "mes" && (
            <CalendarioGrade
              dias={dias}
              hoje={hoje}
              agora={agora}
              reservas={reservas}
              destaque={destaque}
              rascunho={novaReserva ? rascunho : null}
              onEscolherHorario={podeReservar ? onEscolherHorario : undefined}
              onAbrirReserva={setSelecionada}
            />
          )}

          {estado.visao === "calendario" && estado.escala === "mes" && (
            <CalendarioMes
              dias={dias}
              referencia={estado.data}
              hoje={hoje}
              agora={agora}
              reservas={reservas}
              destaque={destaque}
              onEscolherDia={
                podeReservar ? (dia) => abrirNovaReserva({ dia }) : undefined
              }
              onAbrirDia={(dia) => ir({ escala: "dia", data: dia })}
              onAbrirReserva={setSelecionada}
            />
          )}
          {tabela && (
            <Tabela
              selecionavel={podeReservar}
              reservas={tabela.reservas}
              paginacao={tabela.paginacao}
              ordenacao={estado.tabela}
              agora={agora}
              destaque={destaque}
              pesquisando={estado.busca.length > 0}
              total={tabela.total}
              onOrdenar={onOrdenar}
            />
          )}
          </div>
        </div>
      </div>

      {reservaAberta && (
        <DetalheDaReserva
          reserva={reservaAberta}
          agora={agora}
          vePalestras={vePalestras}
          podeExcluirPalestra={painel?.permitePalestra ?? false}
          onFechar={() => setSelecionada(null)}
          onCancelar={() => {
            setSelecionada(null);
            setConfirmacao({ tipo: "cancelar", reserva: reservaAberta });
          }}
          onExcluir={() => {
            setSelecionada(null);
            setConfirmacao({
              tipo: reservaAberta.ehPalestra ? "palestra" : "excluir",
              reserva: reservaAberta,
            });
          }}
        />
      )}

      {confirmacao?.tipo === "cancelar" && (
        <CancelarReserva
          key={confirmacao.reserva.id}
          bookingId={confirmacao.reserva.id}
          descricao={descreverReserva(confirmacao.reserva)}
          aberto
          onAbertoChange={(aberto) => !aberto && setConfirmacao(null)}
        />
      )}

      {confirmacao?.tipo === "palestra" && (
        <ConfirmarExclusao
          titulo="Excluir palestra?"
          descricao={confirmacao.reserva.purpose}
          aviso="As inscrições são removidas junto, e o espaço é liberado no horário da palestra."
          acao={() =>
            excluirPalestra(confirmacao.reserva.id.replace("palestra:", ""))
          }
          onFechar={() => setConfirmacao(null)}
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

      {painel && novaReserva && (
        <PainelDeReserva
          key={`${novaReserva.dia}-${novaReserva.inicio ?? ""}-${novaReserva.fim ?? ""}-${novaReserva.tipo ?? ""}`}
          catalogos={painel.catalogos}
          hoje={hoje}
          professorFixo={painel.professorFixo}
          preenchimento={{
            activityType: novaReserva.tipo,
            date: novaReserva.dia,
            startTime: novaReserva.inicio,
            endTime:
              novaReserva.fim ??
              (novaReserva.inicio
                ? sugerirTermino(novaReserva.inicio)
                : undefined),
          }}
          onFechar={onFechar}
          onConcluir={onConcluir}
          onRascunho={setRascunho}
          permitePalestra={painel.permitePalestra}
        />
      )}
    </>
  );
}
