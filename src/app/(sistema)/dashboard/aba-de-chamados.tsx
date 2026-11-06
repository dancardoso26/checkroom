import { compararComAnterior } from "@/domain/painel/comparacao";
import { chamadosCriadosNoPeriodo, chamadosPorSituacao, formatarDuracao, indicadoresDeChamados, rankingPorContagem } from "@/domain/painel/indicadores";
import { diasDoPeriodo, periodoAnterior, type Periodo } from "@/domain/painel/periodo";
import { serieDoPeriodo } from "@/domain/painel/serie-temporal";
import type { DadosDoPainel } from "@/lib/repositories/repositorio-do-painel";

import { intervaloEmTexto, numero, plural } from "./formatadores";
import { GraficoDeChamados, Indicadores } from "./graficos";
import {
  FilaDeChamados,
  RankingDeBarras,
  SerieTemporal,
} from "./graficos-de-analise";

export function AbaDeChamados({
  dados,
  periodo,
  anterior,
  agora,
}: {
  dados: DadosDoPainel;
  periodo: Periodo;
  anterior: DadosDoPainel;
  agora: Date;
}) {
  const periodoPassado = periodoAnterior(periodo);
  const passado = indicadoresDeChamados(anterior.chamados, periodoPassado);
  const criados = chamadosCriadosNoPeriodo(dados.chamados, periodo);
  const indicadores = indicadoresDeChamados(dados.chamados, periodo);
  const nomesDosEspacos = new Map(dados.espacos.map((e) => [e.id, e.nome]));

  const resolvidos = dados.chamados.flatMap((c) =>
    c.resolvidoEm ? [c.resolvidoEm] : []
  );

  return (
    <div className="space-y-4">
      <Indicadores
        periodoAnterior={intervaloEmTexto(
          diasDoPeriodo(periodoPassado).de,
          diasDoPeriodo(periodoPassado).ate
        )}
        blocos={[
          {
            rotulo: "Chamados abertos no período",
            valor: numero.format(indicadores.criados),
            comparacao: compararComAnterior(indicadores.criados, passado.criados, {
              unidade: "percentual",
              melhorQuando: "descer",
            }),
          },
          {
            rotulo: "Não resolvidos",
            valor: numero.format(indicadores.abertos + indicadores.emAtendimento),
            apoio: `${plural(indicadores.abertos, "aberto", "abertos")}, ${indicadores.emAtendimento} em atendimento`,
          },
          {
            rotulo: "Tempo médio até assumir",
            valor: formatarDuracao(indicadores.horasAteAssumir),
            comparacao: compararComAnterior(
              indicadores.horasAteAssumir,
              passado.horasAteAssumir,
              { unidade: "percentual", melhorQuando: "descer" }
            ),
          },
          {
            rotulo: "Tempo médio até resolver",
            valor: formatarDuracao(indicadores.horasAteResolver),
            comparacao: compararComAnterior(
              indicadores.horasAteResolver,
              passado.horasAteResolver,
              { unidade: "percentual", melhorQuando: "descer" }
            ),
          },
        ]}
      />

      <SerieTemporal
        titulo="Abertos e resolvidos por dia"
        descricao="Chamados criados e chamados resolvidos em cada data do período."
        pontos={serieDoPeriodo(periodo, {
          abertos: criados.map((c) => c.criadoEm),
          resolvidos,
        })}
        series={[
          { chave: "abertos", rotulo: "Abertos", cor: "var(--chart-1)" },
          { chave: "resolvidos", rotulo: "Resolvidos", cor: "var(--chart-2)" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <GraficoDeChamados linhas={chamadosPorSituacao(criados)} />
        <RankingDeBarras
          titulo="Chamados por espaço"
          descricao="Espaços com mais chamados abertos no período."
          itens={rankingPorContagem(
            criados.map((c) => c.espacoId),
            nomesDosEspacos,
            8
          )}
          unidade={["chamado", "chamados"]}
          total={criados.length}
        />
      </div>

      <FilaDeChamados
        itens={dados.fila.map((c) => ({
          id: c.id,
          descricao: c.descricao,
          espaco: c.espaco,
          prioridade: c.prioridade,
          situacao: c.situacao,
          idade: formatarDuracao((agora.getTime() - c.criadoEm.getTime()) / 3_600_000),
        }))}
      />
    </div>
  );
}
