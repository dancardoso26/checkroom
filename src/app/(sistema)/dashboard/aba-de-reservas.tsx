import { compararComAnterior } from "@/domain/painel/comparacao";
import { indicadoresDeReservas, rankingPorContagem, reservasPorTipo } from "@/domain/painel/indicadores";
import { espacosOciosos, ocupacaoPorEspaco } from "@/domain/painel/ocupacao";
import { diasDoPeriodo, periodoAnterior, type Periodo } from "@/domain/painel/periodo";
import { mapaDeCalor, serieDoPeriodo } from "@/domain/painel/serie-temporal";
import type { DadosDoPainel } from "@/lib/repositories/repositorio-do-painel";

import { horas, intervaloEmTexto, porcentagem } from "./formatadores";
import { GraficoDeOcupacao, Indicadores } from "./graficos";
import {
  EspacosOciosos,
  MapaDeCalorDeReservas,
  RankingDeBarras,
  SerieTemporal,
} from "./graficos-de-analise";

export function AbaDeReservas({
  dados,
  periodo,
  anterior,
}: {
  dados: DadosDoPainel;
  periodo: Periodo;
  anterior: DadosDoPainel;
}) {
  const periodoPassado = periodoAnterior(periodo);
  const ocupacaoPassada = ocupacaoPorEspaco(
    anterior.espacos,
    [...anterior.reservas.filter((r) => !r.cancelada), ...anterior.palestras],
    periodoPassado
  );
  const passado = indicadoresDeReservas(anterior.reservas, ocupacaoPassada, periodoPassado);

  const ativas = dados.reservas.filter((r) => !r.cancelada);
  const canceladas = dados.reservas.filter((r) => r.cancelada);
  const ocupacoes = [...ativas, ...dados.palestras];

  const ocupacao = ocupacaoPorEspaco(dados.espacos, ocupacoes, periodo);
  const predios = new Map(dados.espacos.map((e) => [e.id, e.predio]));
  const indicadores = indicadoresDeReservas(dados.reservas, ocupacao, periodo);

  const nomesDasTurmas = new Map(
    [...dados.turmas.entries()].map(([id, turma]) => [id, turma.nome])
  );

  const porCurso = rankingPorContagem(
    ativas.map((r) => dados.turmas.get(r.turmaId)?.cursoId ?? null),
    dados.cursos,
    8
  );

  const porTipo = reservasPorTipo(dados.reservas).map(({ tipo, total }) => ({
    id: tipo,
    nome: tipo,
    total,
  }));

  return (
    <div className="space-y-4">
      <Indicadores
        periodoAnterior={intervaloEmTexto(
          diasDoPeriodo(periodoPassado).de,
          diasDoPeriodo(periodoPassado).ate
        )}
        blocos={[
          {
            rotulo: "Reservas no período",
            valor: String(indicadores.reservas),
            comparacao: compararComAnterior(indicadores.reservas, passado.reservas, {
              unidade: "percentual",
              melhorQuando: "subir",
            }),
          },
          {
            rotulo: "Taxa de cancelamento",
            valor: porcentagem.format(indicadores.taxaDeCancelamento),
            comparacao: compararComAnterior(
              indicadores.taxaDeCancelamento,
              passado.taxaDeCancelamento,
              { unidade: "pontos", melhorQuando: "descer" }
            ),
          },
          {
            rotulo: "Ocupação média dos espaços",
            valor: porcentagem.format(indicadores.taxaMedia),
            comparacao: compararComAnterior(indicadores.taxaMedia, passado.taxaMedia, {
              unidade: "pontos",
              melhorQuando: "subir",
            }),
          },
          {
            rotulo: "Horas reservadas",
            valor: `${horas.format(indicadores.horasReservadas)} h`,
            comparacao: compararComAnterior(
              indicadores.horasReservadas,
              passado.horasReservadas,
              { unidade: "percentual", melhorQuando: "subir" }
            ),
          },
        ]}
      />

      <SerieTemporal
        comTabela={false}
        titulo="Reservas por dia"
        descricao="Reservas pela data em que acontecem. Períodos longos são agrupados por mês."
        pontos={serieDoPeriodo(periodo, {
          reservas: ativas.map((r) => r.inicio),
          canceladas: canceladas.map((r) => r.inicio),
        })}
        series={[
          { chave: "reservas", rotulo: "Reservas", cor: "var(--chart-1)" },
          { chave: "canceladas", rotulo: "Canceladas", cor: "hsl(var(--destructive))" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <GraficoDeOcupacao
          ocupacao={ocupacao.map((o) => ({ ...o, predio: predios.get(o.espacoId) ?? 0 }))}
        />
        <MapaDeCalorDeReservas
          titulo="Horários mais ocupados"
          descricao="Horas de espaço em uso, por dia da semana e hora do dia."
          mapa={mapaDeCalor(ocupacoes, periodo)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RankingDeBarras
          titulo="Professores que mais reservam"
          descricao="Os cinco professores com mais reservas no período."
          itens={rankingPorContagem(ativas.map((r) => r.professorId), dados.professores)}
          unidade={["reserva", "reservas"]}
          total={ativas.length}
        />
        <RankingDeBarras
          titulo="Turmas que mais reservam"
          descricao="As cinco turmas com mais reservas no período."
          itens={rankingPorContagem(ativas.map((r) => r.turmaId), nomesDasTurmas)}
          unidade={["reserva", "reservas"]}
          total={ativas.length}
        />
        <RankingDeBarras
          titulo="Reservas por curso"
          descricao="Reservas das turmas de cada curso."
          itens={porCurso}
          unidade={["reserva", "reservas"]}
          total={ativas.length}
        />
        <RankingDeBarras
          titulo="Reservas por tipo de atividade"
          descricao="Aula, prova ou evento."
          itens={porTipo}
          unidade={["reserva", "reservas"]}
        />
      </div>

      <EspacosOciosos espacos={espacosOciosos(ocupacao)} />
    </div>
  );
}
