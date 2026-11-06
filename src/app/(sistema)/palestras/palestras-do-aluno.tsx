"use client";

import { useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { AvisoDeConflito } from "@/components/aviso-de-conflito";
import { BarraDeOcupacao } from "@/components/barra-de-ocupacao";
import { RotuloDeCampo } from "@/components/rotulo-de-campo";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MENSAGEM_DA_INSCRICAO,
  type SituacaoParaOAluno,
} from "@/domain/palestras/palestra";
import type { Status } from "@/domain/status/status";
import { formatPeriod } from "@/lib/datetime";
import type { PalestraItem } from "@/lib/repositories/repositorio-de-palestras";

import { cancelarInscricao, inscreverEmPalestra } from "./acoes";

type Palestra = PalestraItem & {
  iniciada: boolean;
  situacaoDoAluno: SituacaoParaOAluno | null;
};

type Aba = "inscrito" | "abertas" | "todas";

const STATUS_DO_ALUNO: Record<SituacaoParaOAluno, Status | null> = {
  inscrito: "inscrito",
  disponivel: "vagas_abertas",
  lotada: "lotada",
  encerrada: "encerrada",
  fora_do_curso: null,
};

const ABAS: { id: Aba; rotulo: string; vazio: string }[] = [
  {
    id: "inscrito",
    rotulo: "Inscrito",
    vazio: "Você ainda não se inscreveu em nenhuma palestra.",
  },
  {
    id: "abertas",
    rotulo: "Abertas",
    vazio: "Nenhuma palestra com inscrições abertas no momento.",
  },
  {
    id: "todas",
    rotulo: "Todas",
    vazio: "Nenhuma palestra do seu curso.",
  },
];

function pertenceAAba(palestra: Palestra, aba: Aba): boolean {
  if (aba === "inscrito") {
    return palestra.situacaoDoAluno === "inscrito" && !palestra.iniciada;
  }
  if (aba === "abertas") return palestra.situacaoDoAluno === "disponivel";
  return true;
}

function CartaoDaPalestra({
  palestra,
  pendente,
  onInscrever,
  onCancelar,
}: {
  palestra: Palestra;
  pendente: boolean;
  onInscrever: () => void;
  onCancelar: () => void;
}) {
  const status =
    palestra.situacaoDoAluno === "inscrito" && palestra.iniciada
      ? "encerrada"
      : palestra.situacaoDoAluno
        ? STATUS_DO_ALUNO[palestra.situacaoDoAluno]
        : null;
  const podeInscrever = palestra.situacaoDoAluno === "disponivel";
  const podeCancelar =
    palestra.situacaoDoAluno === "inscrito" && !palestra.iniciada;

  return (
    <article
      data-palestra={palestra.titulo}
      className="bg-card space-y-4 rounded-lg border p-4"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="font-semibold">{palestra.titulo}</h2>
          <p className="text-muted-foreground text-xs">
            {palestra.cursos.join(", ")}
          </p>
        </div>
        {status && <StatusBadge status={status} />}
      </header>

      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="text-muted-foreground text-xs">
            <RotuloDeCampo rotulo="Data e hora" />
          </dt>
          <dd>{formatPeriod(palestra.inicio, palestra.fim)}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground text-xs">
            <RotuloDeCampo rotulo="Palestrante" />
          </dt>
          <dd>{palestra.palestrante}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground text-xs">
            <RotuloDeCampo rotulo="Espaço" />
          </dt>
          <dd>{palestra.espaco}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground text-xs">
            <RotuloDeCampo rotulo="Vagas" />
          </dt>
          <dd className="space-y-1.5">
            <span>
              {palestra.inscritos} de {palestra.vagas} inscritos
            </span>
            <BarraDeOcupacao
              ocupadas={palestra.inscritos}
              total={palestra.vagas}
              rotulo={`Ocupação de ${palestra.titulo}`}
            />
          </dd>
        </div>
      </dl>

      {(podeInscrever || podeCancelar) && (
        <footer className="flex justify-end">
          {podeInscrever && (
            <Button size="sm" disabled={pendente} onClick={onInscrever}>
              {pendente && <Loader2 className="animate-spin" aria-hidden />}
              Inscrever-se
            </Button>
          )}
          {podeCancelar && (
            <Button
              size="sm"
              variant="outline"
              disabled={pendente}
              onClick={onCancelar}
            >
              {pendente ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <X aria-hidden />
              )}
              Cancelar inscrição
            </Button>
          )}
        </footer>
      )}
    </article>
  );
}

export function PalestrasDoAluno({
  palestras,
  semCurso,
}: {
  palestras: Palestra[];
  semCurso: boolean;
}) {
  const [aba, setAba] = useState<Aba>("abertas");
  const [erro, setErro] = useState<string | null>(null);
  const [conflito, setConflito] = useState<string | null>(null);
  const [emAndamento, setEmAndamento] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function executar(
    id: string,
    acao: (id: string) => Promise<{ ok: boolean; mensagem?: string }>,
    sucesso: string,
  ) {
    setErro(null);
    setConflito(null);
    setEmAndamento(id);
    startTransition(async () => {
      const resultado = await acao(id);
      if (resultado.ok) toast.success(sucesso);
      else {
        if (resultado.mensagem === MENSAGEM_DA_INSCRICAO.CONFLITO_DE_HORARIO) {
          setConflito(resultado.mensagem);
        } else {
          setErro(resultado.mensagem ?? null);
        }
      }
      setEmAndamento(null);
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
        Palestras
      </h1>

      {semCurso && (
        <p className="text-muted-foreground text-sm">
          Sua conta ainda não tem curso definido. Peça à administração para
          vinculá-la à sua turma e ver as palestras do seu curso.
        </p>
      )}

      {erro && (
        <p className="text-destructive text-sm" role="alert">
          {erro}
        </p>
      )}

      <Tabs value={aba} onValueChange={(valor) => setAba(valor as Aba)}>
        <TabsList>
          {ABAS.map(({ id, rotulo }) => (
            <TabsTrigger key={id} value={id}>
              {rotulo}
              <span className="text-muted-foreground text-xs">
                {palestras.filter((p) => pertenceAAba(p, id)).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {ABAS.map(({ id, vazio }) => {
          const daAba = palestras.filter((p) => pertenceAAba(p, id));

          return (
            <TabsContent key={id} value={id} className="space-y-3">
              {daAba.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
                  {vazio}
                </p>
              ) : (
                daAba.map((palestra) => (
                  <CartaoDaPalestra
                    key={palestra.id}
                    palestra={palestra}
                    pendente={pendente && emAndamento === palestra.id}
                    onInscrever={() =>
                      executar(
                        palestra.id,
                        inscreverEmPalestra,
                        "Inscrição realizada.",
                      )
                    }
                    onCancelar={() =>
                      executar(
                        palestra.id,
                        cancelarInscricao,
                        "Inscrição cancelada.",
                      )
                    }
                  />
                ))
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <AvisoDeConflito mensagem={conflito} onFechar={() => setConflito(null)} />
    </div>
  );
}
