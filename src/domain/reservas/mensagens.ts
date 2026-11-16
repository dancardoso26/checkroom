import { formatarPeriodo } from "@/lib/datas";
import type { ViolacaoDaReserva, OcupacaoExistente } from "./tipos";

function periodoDe(ocupacao: OcupacaoExistente): string {
  return formatarPeriodo(ocupacao.inicio, ocupacao.fim);
}

export type RotulosDasViolacoes = {
  nomesDosRecursos?: Record<string, string>;
};

export function descreverViolacao(
  violacao: ViolacaoDaReserva,
  rotulos: RotulosDasViolacoes = {},
): string {
  switch (violacao.codigo) {
    case "PERIODO_INVALIDO":
      return "O horário de término precisa ser posterior ao de início.";

    case "FINALIDADE_VAZIA":
      return "Informe a finalidade da reserva.";

    case "ESPACO_NAO_ENCONTRADO":
      return "O espaço selecionado não está mais disponível no sistema.";

    case "TURMA_NAO_ENCONTRADA":
      return "A turma selecionada não está mais disponível no sistema.";

    case "INICIO_NO_PASSADO":
      return "Não é possível reservar um horário que já passou.";

    case "FORA_DO_EXPEDIENTE":
      return `A instituição funciona das ${violacao.abertura} às ${violacao.fechamento}, e a reserva precisa começar e terminar no mesmo dia.`;

    case "CONFLITO_DE_ESPACO":
      return violacao.conflito.finalidade === null
        ? `O espaço já está reservado em ${periodoDe(violacao.conflito)}.`
        : `O espaço já está reservado neste horário para "${
            violacao.conflito.finalidade
          }", em ${periodoDe(violacao.conflito)}.`;

    case "CONFLITO_DE_PROFESSOR":
      return violacao.conflito.finalidade === null
        ? `O professor já tem uma reserva em ${periodoDe(violacao.conflito)}.`
        : `O professor já tem uma reserva neste horário: "${
            violacao.conflito.finalidade
          }", em ${periodoDe(violacao.conflito)}.`;

    case "CONFLITO_DE_TURMA":
      return violacao.conflito.finalidade === null
        ? `A turma já tem uma reserva em ${periodoDe(violacao.conflito)}.`
        : `A turma já tem uma reserva neste horário: "${
            violacao.conflito.finalidade
          }", em ${periodoDe(violacao.conflito)}.`;

    case "DISCIPLINA_OBRIGATORIA":
      return "Informe a disciplina da aula.";

    case "SEM_VINCULO_DOCENTE":
      return `Este professor não leciona a disciplina selecionada para esta turma no período ${violacao.periodo}.`;

    case "CAPACIDADE_INSUFICIENTE":
      return `O espaço comporta ${violacao.capacidade} pessoas e a turma tem ${violacao.quantidadeDeAlunos} alunos.`;

    case "RECURSOS_FALTANTES": {
      const nomes = violacao.recursosFaltantes.map(
        (id) => rotulos.nomesDosRecursos?.[id] ?? id,
      );

      return nomes.length === 1
        ? `O espaço não oferece o recurso exigido: ${nomes[0]}.`
        : `O espaço não oferece os recursos exigidos: ${nomes.join(", ")}.`;
    }

    case "FORA_DO_PERIODO_LETIVO":
      return "A data não pertence a nenhum período letivo cadastrado.";

    case "DATA_BLOQUEADA":
      return `A instituição não funciona nesta data: ${violacao.motivo}.`;

    case "ESPACO_BLOQUEADO":
      return `O espaço está bloqueado nesta data: ${violacao.motivo}.`;
  }
}

export function descreverViolacoes(
  violacoes: ViolacaoDaReserva[],
  rotulos: RotulosDasViolacoes = {},
): string[] {
  return violacoes.map((violacao) => descreverViolacao(violacao, rotulos));
}
