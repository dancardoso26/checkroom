"use client";

import type { LucideIcon } from "lucide-react";
import { BookOpen, Clock, Monitor, User, Users } from "lucide-react";

import { SeletorDeData } from "@/components/seletor-de-data";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ULTIMO_INICIO } from "@/domain/booking/businessHours";
import type { ActivityType } from "@/domain/booking/types";
import { cn } from "@/lib/utils";

import type { AnaliseResult } from "./analise";
import {
  ehPeriodoValido,
  ROTULO_DA_ATIVIDADE,
  type CamposDaReserva,
} from "./campos";
import type { Catalogos } from "./painel-de-reserva";
import { SeletorDeRecursos } from "./seletor-de-recursos";
import { TimeSelect } from "./time-select";
import { Aviso } from "./ui";

const TIPOS = Object.entries(ROTULO_DA_ATIVIDADE) as [ActivityType, string][];

// Uma linha do formulário: ícone à esquerda e o campo, como no Google Agenda.
// O rótulo fica para o leitor de tela; na tela, ícone e placeholder bastam.
function Linha({
  icone: Icone,
  rotulo,
  htmlFor,
  children,
}: {
  icone: LucideIcon;
  rotulo: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icone
        aria-hidden
        className="text-muted-foreground mt-2 size-5 shrink-0"
      />
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor={htmlFor} className="sr-only">
          {rotulo}
        </Label>
        {children}
      </div>
    </div>
  );
}

export function DetalhesDaAtividade({
  campos,
  alterar,
  catalogos,
  professorFixo,
  hoje,
  recursos,
  alternarRecurso,
  analise,
  analisando,
  atividadeCompleta,
}: {
  campos: CamposDaReserva;
  alterar: (campo: keyof CamposDaReserva, valor: string) => void;
  catalogos: Catalogos;
  professorFixo: string | null;
  hoje: string;
  recursos: string[];
  alternarRecurso: (id: string, marcado: boolean) => void;
  analise: AnaliseResult | null;
  analisando: boolean;
  /** Tudo preenchido: só então a agenda é verificada e o resultado, mostrado. */
  atividadeCompleta: boolean;
}) {
  const { professors, classes, subjects, assignments, resources } = catalogos;
  const ehAula = campos.activityType === "class";

  const turmasPermitidas =
    ehAula && campos.professorId
      ? classes.filter((c) =>
          assignments.some(
            (a) => a.professorId === campos.professorId && a.classId === c.id
          )
        )
      : classes;

  const disciplinasPermitidas =
    campos.professorId && campos.classId
      ? subjects.filter((s) =>
          assignments.some(
            (a) =>
              a.professorId === campos.professorId &&
              a.classId === campos.classId &&
              a.subjectId === s.id
          )
        )
      : [];

  const periodoValido = ehPeriodoValido(campos);

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <Label htmlFor="purposeField" className="sr-only">
          Título da atividade
        </Label>
        <input
          id="purposeField"
          value={campos.purpose}
          onChange={(e) => alterar("purpose", e.target.value)}
          placeholder="Adicionar título"
          maxLength={200}
          className="border-input focus:border-primary placeholder:text-muted-foreground w-full border-b-2 bg-transparent pb-1 text-xl outline-none focus-visible:outline-none!"
        />

        <RadioGroup
          aria-label="Tipo de atividade"
          value={campos.activityType}
          onValueChange={(v) => {
            alterar("activityType", v);
            alterar("subjectId", "");
            // A aula filtra turmas pelo vínculo; a escolhida pode não estar nele.
            if (v === "class") alterar("classId", "");
          }}
          className="flex flex-wrap gap-1.5"
        >
          {TIPOS.map(([valor, rotulo]) => (
            <label
              key={valor}
              htmlFor={`tipo-${valor}`}
              className={cn(
                "has-focus-visible:ring-ring/50 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors has-focus-visible:ring-[3px]",
                campos.activityType === valor
                  ? "bg-primary-subtle text-primary"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <RadioGroupItem
                id={`tipo-${valor}`}
                value={valor}
                className="sr-only"
              />
              {rotulo}
            </label>
          ))}
        </RadioGroup>
      </div>

      <Linha icone={Clock} rotulo="Data" htmlFor="dateField">
        {/* Data e horário na mesma linha, como no Google Agenda. */}
        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem_auto_6.5rem] items-center gap-2">
          <SeletorDeData
            id="dateField"
            value={campos.date}
            onChange={(v) => alterar("date", v)}
            minimo={hoje}
            hoje={hoje}
          />
          <Label htmlFor="startField" className="sr-only">
            Início
          </Label>
          <TimeSelect
            id="startField"
            value={campos.startTime}
            onChange={(v) => alterar("startTime", v)}
            maximo={ULTIMO_INICIO}
          />
          <span className="text-muted-foreground text-sm">às</span>
          <Label htmlFor="endField" className="sr-only">
            Término
          </Label>
          <TimeSelect
            id="endField"
            value={campos.endTime}
            onChange={(v) => alterar("endTime", v)}
            // Só horários depois do início: a opção de errar nem aparece.
            minimo={campos.startTime || undefined}
          />
        </div>
        {campos.startTime !== "" && campos.endTime !== "" && !periodoValido && (
          <p className="text-destructive text-sm">
            O término precisa ser posterior ao início.
          </p>
        )}
      </Linha>

      <Linha
        icone={User}
        rotulo="Professor responsável"
        htmlFor="professorField"
      >
        {professorFixo ? (
          // Professor reserva em seu nome: não há escolha, só a informação.
          <div id="professorField" className="flex h-9 items-center text-sm">
            {professors.find((p) => p.id === professorFixo)?.name ??
              "Professor não identificado"}
          </div>
        ) : (
          <Select
            value={campos.professorId}
            onValueChange={(v) => {
              alterar("professorId", v);
              // Outro professor muda as turmas e disciplinas possíveis.
              alterar("classId", "");
              alterar("subjectId", "");
            }}
          >
            <SelectTrigger id="professorField" className="w-full">
              <SelectValue placeholder="Professor" />
            </SelectTrigger>
            <SelectContent>
              {professors.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Linha>

      <Linha icone={Users} rotulo="Turma" htmlFor="classField">
        <Select
          value={campos.classId}
          onValueChange={(v) => {
            alterar("classId", v);
            alterar("subjectId", "");
          }}
          disabled={ehAula && !campos.professorId}
        >
          <SelectTrigger id="classField" className="w-full">
            <SelectValue
              placeholder={
                ehAula && !campos.professorId
                  ? "Turma (escolha o professor primeiro)"
                  : "Turma"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {turmasPermitidas.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} · {t.courseName} ({t.studentCount} alunos)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {ehAula && campos.professorId && turmasPermitidas.length === 0 && (
          <Aviso tom="erro" titulo="Sem vínculo acadêmico">
            Este professor não leciona para nenhuma turma no período letivo.
            Escolha outro, ou registre como palestra, prova, defesa ou evento.
          </Aviso>
        )}
      </Linha>

      {ehAula && (
        <Linha icone={BookOpen} rotulo="Disciplina" htmlFor="subjectField">
          <Select
            value={campos.subjectId}
            onValueChange={(v) => alterar("subjectId", v)}
            disabled={!campos.classId || disciplinasPermitidas.length === 0}
          >
            <SelectTrigger id="subjectField" className="w-full">
              <SelectValue
                placeholder={
                  campos.classId
                    ? "Disciplina"
                    : "Disciplina (escolha a turma primeiro)"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {disciplinasPermitidas.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Linha>
      )}

      <Linha
        icone={Monitor}
        rotulo="Itens necessários"
        htmlFor="resourcesField"
      >
        <SeletorDeRecursos
          id="resourcesField"
          recursos={resources}
          selecionados={recursos}
          alternar={alternarRecurso}
        />
      </Linha>

      {/* Só depois de tudo preenchido: antes disso, o que falta é preenchimento,
          e não conflito de agenda. */}
      {atividadeCompleta && periodoValido && (
        <div className="pl-8">
          <ResultadoDaAgenda analise={analise} analisando={analisando} />
        </div>
      )}
    </div>
  );
}

function ResultadoDaAgenda({
  analise,
  analisando,
}: {
  analise: AnaliseResult | null;
  analisando: boolean;
}) {
  if (analisando || analise === null) {
    return (
      <p className="text-muted-foreground text-sm">Verificando agendas...</p>
    );
  }

  if (analise.status === "invalid") {
    return <p className="text-muted-foreground text-sm">{analise.message}</p>;
  }

  if (analise.scheduleMessages.length === 0) {
    return (
      <p aria-live="polite" className="text-success text-sm font-medium">
        Horário disponível para o professor e a turma
      </p>
    );
  }

  return (
    <Aviso tom="erro" titulo="Conflito de agenda">
      <ul className="list-disc space-y-1 pl-4">
        {analise.scheduleMessages.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </Aviso>
  );
}
