"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  ROTULO_DA_SITUACAO,
  STATUS_DA_PRIORIDADE,
  type Prioridade,
  type SituacaoDoChamado,
} from "@/domain/chamados/chamado";
import type { ItemDoRanking } from "@/domain/painel/indicadores";
import type { OcupacaoDoEspaco } from "@/domain/painel/ocupacao";
import type { MapaDeCalor, PontoDaSerie } from "@/domain/painel/serie-temporal";

import { horas, numero, participacao, porcentagem } from "./formatadores";
import { TabelaDosDados } from "./graficos";

export type SerieDoGrafico = { chave: string; rotulo: string; cor: string };

export function SerieTemporal({
  titulo,
  descricao,
  pontos,
  series,
  comTabela = true,
}: {
  titulo: string;
  descricao: string;
  pontos: PontoDaSerie[];
  series: SerieDoGrafico[];
  comTabela?: boolean;
}) {
  const config = Object.fromEntries(
    series.map((serie) => [serie.chave, { label: serie.rotulo, color: serie.cor }])
  ) satisfies ChartConfig;

  const vazio = pontos.every((ponto) => series.every((s) => ponto[s.chave] === 0));
  const prefixo = useId().replace(/:/g, "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        {vazio ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Nada registrado no período.
          </p>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-64 w-full">
            <AreaChart data={pontos} margin={{ top: 8, right: 12, left: 0 }}>
              <defs>
                {series.map((serie) => (
                  <linearGradient
                    key={serie.chave}
                    id={`${prefixo}-${serie.chave}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={`var(--color-${serie.chave})`} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={`var(--color-${serie.chave})`} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="rotulo"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
              {series.map((serie) => (
                <Area
                  key={serie.chave}
                  dataKey={serie.chave}
                  type="monotone"
                  stroke={`var(--color-${serie.chave})`}
                  strokeWidth={2}
                  fill={`url(#${prefixo}-${serie.chave})`}
                  dot={pontos.length <= 31}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        )}

        {comTabela && (
          <TabelaDosDados
            colunas={["Data", ...series.map((s) => s.rotulo)]}
            linhas={pontos.map((ponto) => [
              ponto.rotulo,
              ...series.map((s) => ponto[s.chave] as number),
            ])}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function MapaDeCalorDeReservas({
  mapa,
  titulo,
  descricao,
}: {
  mapa: MapaDeCalor;
  titulo: string;
  descricao: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        {mapa.maximo === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Nenhuma reserva no período.
          </p>
        ) : (
          <div className="space-y-1" role="table" aria-label={titulo}>
            <div
              className="grid items-center gap-1"
              style={{ gridTemplateColumns: `2.5rem repeat(${mapa.horas.length}, minmax(0, 1fr))` }}
              role="row"
            >
              <span />
              {mapa.horas.map((hora) => (
                <span
                  key={hora}
                  className="text-muted-foreground text-center text-[10px] tabular-nums"
                  role="columnheader"
                >
                  {hora}h
                </span>
              ))}
            </div>
            {mapa.linhas.map((linha) => (
              <div
                key={linha.dia}
                className="grid items-center gap-1"
                style={{ gridTemplateColumns: `2.5rem repeat(${mapa.horas.length}, minmax(0, 1fr))` }}
                role="row"
              >
                <span className="text-muted-foreground text-xs" role="rowheader">
                  {linha.dia}
                </span>
                {linha.valores.map((valor, i) => {
                  const intensidade = valor / mapa.maximo;
                  return (
                    <span
                      key={mapa.horas[i]}
                      role="cell"
                      title={`${linha.dia}, ${mapa.horas[i]}h: ${horas.format(valor)} h reservadas`}
                      aria-label={`${linha.dia}, ${mapa.horas[i]}h: ${horas.format(valor)} horas reservadas`}
                      className="h-7 rounded-sm"
                      style={{
                        backgroundColor: `color-mix(in srgb, var(--chart-1) ${Math.round(intensidade * 100)}%, var(--chart-trilha))`,
                      }}
                    />
                  );
                })}
              </div>
            ))}
            <div className="text-muted-foreground flex items-center justify-end gap-2 pt-2 text-xs">
              <span>Menos</span>
              <span
                className="h-2 w-24 rounded-full"
                style={{
                  backgroundImage: "linear-gradient(to right, var(--chart-trilha), var(--chart-1))",
                }}
              />
              <span>Mais</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RankingDeBarras({
  titulo,
  descricao,
  itens,
  unidade,
  total,
  vazio = "Nada registrado no período.",
}: {
  titulo: string;
  descricao: string;
  itens: ItemDoRanking[];
  unidade: [string, string];
  total?: number;
  vazio?: string;
}) {
  const maximo = Math.max(1, ...itens.map((item) => item.total));
  const base = total ?? itens.reduce((soma, item) => soma + item.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        {itens.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">{vazio}</p>
        ) : (
          <ul className="space-y-3">
            {itens.map((item) => (
              <li key={item.id} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{item.nome}</span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {numero.format(item.total)} {item.total === 1 ? unidade[0] : unidade[1]} ({participacao(item.total, base)})
                  </span>
                </div>
                <div
                  role="meter"
                  aria-label={`${item.nome}: ${item.total} ${item.total === 1 ? unidade[0] : unidade[1]}`}
                  aria-valuemin={0}
                  aria-valuemax={maximo}
                  aria-valuenow={item.total}
                  className="h-2 overflow-hidden rounded-full"
                  style={{ backgroundColor: "var(--chart-trilha)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(item.total / maximo) * 100}%`, backgroundColor: "var(--chart-1)" }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function EspacosOciosos({ espacos }: { espacos: OcupacaoDoEspaco[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Espaços ociosos</CardTitle>
        <CardDescription>Espaços com menos de 5% do expediente ocupado no período.</CardDescription>
      </CardHeader>
      <CardContent>
        {espacos.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Todos os espaços passaram de 5% de ocupação.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {espacos.map((espaco) => (
              <li
                key={espaco.espacoId}
                className="flex items-baseline justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <span className="truncate font-medium">{espaco.nome}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {horas.format(espaco.horas)} h ({porcentagem.format(espaco.taxa)})
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export type ItemDaFila = {
  id: string;
  descricao: string;
  espaco: string;
  prioridade: Prioridade;
  situacao: SituacaoDoChamado;
  idade: string;
};

export function FilaDeChamados({ itens }: { itens: ItemDaFila[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chamados não resolvidos</CardTitle>
        <CardDescription>
          Abertos e em atendimento, dos mais antigos para os mais recentes, sem depender do período escolhido.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {itens.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Nenhum chamado não resolvido.
          </p>
        ) : (
          <ul className="divide-y">
            {itens.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium">{item.descricao}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.espaco} · {ROTULO_DA_SITUACAO[item.situacao]} · aberto há {item.idade}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={STATUS_DA_PRIORIDADE[item.prioridade]} />
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/chamados?chamado=${item.id}`}>Ver chamado</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
