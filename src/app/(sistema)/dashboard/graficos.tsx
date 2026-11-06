"use client";

import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ROTULO_DA_PRIORIDADE,
  ROTULO_DA_SITUACAO,
} from "@/domain/chamados/chamado";
import type { Comparacao } from "@/domain/painel/comparacao";
import type { ChamadosPorSituacao } from "@/domain/painel/indicadores";
import type { OcupacaoDoEspaco } from "@/domain/painel/ocupacao";
import { cn } from "@/lib/utils";

import { horas, numero, porcentagem, variacao } from "./formatadores";

export type BlocoDeIndicador = {
  rotulo: string;
  valor: string;
  apoio?: string;
  comparacao?: Comparacao;
};

const COR_DA_COMPARACAO = {
  bom: "text-success",
  ruim: "text-destructive",
  neutro: "text-muted-foreground",
} as const;

function ComparacaoComAnterior({
  comparacao,
  anterior,
}: {
  comparacao: Comparacao;
  anterior: string;
}) {
  const { valor } = comparacao;
  const Seta = valor !== null && valor < 0 ? ArrowDownRight : ArrowUpRight;

  return (
    <p
      className={cn(
        "flex items-center gap-1 text-xs font-medium",
        COR_DA_COMPARACAO[comparacao.tom]
      )}
      data-comparacao
      title={`Período anterior: ${anterior}`}
    >
      {valor !== null && valor !== 0 && <Seta className="size-3.5" aria-hidden />}
      <span>{variacao(comparacao)}</span>
    </p>
  );
}

export function Indicadores({
  blocos,
  periodoAnterior,
}: {
  blocos: BlocoDeIndicador[];
  periodoAnterior: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {blocos.map((bloco) => (
        <Card key={bloco.rotulo} className="gap-1 py-4">
          <CardContent className="space-y-1 px-4">
            <p className="text-muted-foreground text-sm">{bloco.rotulo}</p>
            <p className="text-2xl font-semibold" data-indicador={bloco.rotulo}>
              {bloco.valor}
            </p>
            {bloco.apoio && <p className="text-muted-foreground text-xs">{bloco.apoio}</p>}
            {bloco.comparacao && (
              <ComparacaoComAnterior comparacao={bloco.comparacao} anterior={periodoAnterior} />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TabelaDosDados({
  colunas,
  linhas,
}: {
  colunas: string[];
  linhas: (string | number)[][];
}) {
  return (
    <details className="group mt-3 text-sm">
      <summary className="text-muted-foreground hover:text-foreground flex w-fit cursor-pointer list-none items-center gap-1 select-none [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="size-4 transition-transform group-open:rotate-90"
          aria-hidden
        />
        Ver dados em tabela
      </summary>
      <Table className="mt-2">
        <TableHeader>
          <TableRow>
            {colunas.map((coluna, i) => (
              <TableHead key={coluna} className={i > 0 ? "text-right" : undefined}>
                {coluna}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((linha) => (
            <TableRow key={String(linha[0])}>
              {linha.map((celula, i) => (
                <TableCell key={i} className={i > 0 ? "text-right tabular-nums" : undefined}>
                  {celula}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </details>
  );
}

const CONFIG_DA_OCUPACAO = {
  horas: { label: "Horas ocupadas", color: "var(--chart-1)" },
} satisfies ChartConfig;

export type OcupacaoComPredio = OcupacaoDoEspaco & { predio: number };

export function GraficoDeOcupacao({ ocupacao }: { ocupacao: OcupacaoComPredio[] }) {
  const [predio, setPredio] = useState<number | null>(null);

  const predios = [...new Set(ocupacao.map((o) => o.predio))].sort((a, b) => a - b);
  const visiveis = predio === null ? ocupacao : ocupacao.filter((o) => o.predio === predio);

  const dados = visiveis.map((o) => ({
    ...o,
    rotulo: `${horas.format(o.horas)} h (${porcentagem.format(o.taxa)})`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ocupação por espaço</CardTitle>
        <CardDescription>
          Horas reservadas ou com palestra, e a parte do expediente que elas ocupam.
        </CardDescription>
        {predios.length > 1 && (
          <div className="flex flex-wrap gap-1.5 pt-1" role="group" aria-label="Filtrar por prédio">
            <Button
              type="button"
              size="xs"
              variant={predio === null ? "default" : "outline"}
              onClick={() => setPredio(null)}
            >
              Todos
            </Button>
            {predios.map((numeroDoPredio) => (
              <Button
                key={numeroDoPredio}
                type="button"
                size="xs"
                variant={predio === numeroDoPredio ? "default" : "outline"}
                onClick={() => setPredio(numeroDoPredio)}
              >
                Prédio {numeroDoPredio}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={CONFIG_DA_OCUPACAO}
          className="aspect-auto w-full"
          style={{ height: Math.max(160, dados.length * 40 + 40) }}
        >
          <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 96 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="nome"
              width={130}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(_valor, _nome, item) => (
                    <span>
                      {(item.payload as (typeof dados)[number]).rotulo} do expediente
                    </span>
                  )}
                />
              }
            />
            <Bar dataKey="horas" fill="var(--color-horas)" radius={[0, 4, 4, 0]} maxBarSize={24}>
              <LabelList
                dataKey="rotulo"
                position="right"
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const CONFIG_DOS_CHAMADOS = {
  high: { label: ROTULO_DA_PRIORIDADE.high, color: "var(--chart-prioridade-alta)" },
  medium: { label: ROTULO_DA_PRIORIDADE.medium, color: "var(--chart-prioridade-media)" },
  low: { label: ROTULO_DA_PRIORIDADE.low, color: "var(--chart-prioridade-baixa)" },
} satisfies ChartConfig;

export function GraficoDeChamados({ linhas }: { linhas: ChamadosPorSituacao[] }) {
  const dados = linhas.map((l) => ({ ...l, rotulo: ROTULO_DA_SITUACAO[l.situacao] }));
  const vazio = linhas.every((l) => l.total === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chamados por situação e prioridade</CardTitle>
        <CardDescription>Chamados abertos no período, na situação em que estão hoje.</CardDescription>
      </CardHeader>
      <CardContent>
        {vazio ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Nenhum chamado aberto no período.
          </p>
        ) : (
          <ChartContainer config={CONFIG_DOS_CHAMADOS} className="aspect-auto h-64 w-full">
            <BarChart data={dados} margin={{ top: 20 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="rotulo" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="low" stackId="p" fill="var(--color-low)" stroke="var(--card)" strokeWidth={2} maxBarSize={48} />
              <Bar dataKey="medium" stackId="p" fill="var(--color-medium)" stroke="var(--card)" strokeWidth={2} maxBarSize={48} />
              <Bar
                dataKey="high"
                stackId="p"
                fill="var(--color-high)"
                stroke="var(--card)"
                strokeWidth={2}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              >
                <LabelList dataKey="total" position="top" className="fill-foreground" fontSize={12} />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}

        <TabelaDosDados
          colunas={["Status", "Alta", "Média", "Baixa", "Total"]}
          linhas={linhas.map((l) => [
            ROTULO_DA_SITUACAO[l.situacao],
            l.high,
            l.medium,
            l.low,
            l.total,
          ])}
        />
      </CardContent>
    </Card>
  );
}

export function InscricoesPorPalestra({
  palestras,
}: {
  palestras: { id: string; titulo: string; vagas: number; inscritos: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inscritos por palestra</CardTitle>
        <CardDescription>Palestras que acontecem no período, com as vagas ocupadas.</CardDescription>
      </CardHeader>
      <CardContent>
        {palestras.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Nenhuma palestra no período.
          </p>
        ) : (
          <ul className="space-y-3">
            {palestras.map((p) => {
              const fracao = p.vagas > 0 ? Math.min(1, p.inscritos / p.vagas) : 0;
              return (
                <li key={p.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{p.titulo}</span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {numero.format(p.inscritos)} de {numero.format(p.vagas)} ({porcentagem.format(fracao)})
                    </span>
                  </div>
                  <div
                    role="meter"
                    aria-label={`Inscritos em ${p.titulo}`}
                    aria-valuemin={0}
                    aria-valuemax={p.vagas}
                    aria-valuenow={p.inscritos}
                    className="h-2 overflow-hidden rounded-full"
                    style={{ backgroundColor: "var(--chart-trilha)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${fracao * 100}%`, backgroundColor: "var(--chart-1)" }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
