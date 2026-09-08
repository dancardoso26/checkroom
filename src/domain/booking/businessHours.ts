/**
 * Horário de funcionamento da instituição.
 *
 * A universidade abre às 7h e fecha às 22h. Fora disso não há portaria nem
 * suporte, então uma reserva às 23h seria aceita pelo sistema e recusada pela
 * realidade.
 *
 * É regra, e não configuração de campo: atributo de HTML se remove pelo
 * inspetor do navegador, e há teste que faz exatamente isso para provar que a
 * recusa vem do servidor.
 *
 * Os valores vivem aqui porque aparecem em três lugares: nos campos do
 * formulário, na verificação da regra e na mensagem de erro. Se um dia houver
 * mais de um campus, ou horário diferente aos sábados, eles saem daqui e passam
 * a vir do banco pelo contexto da regra.
 */

/** 7h, em minutos desde a meia-noite. */
export const ABERTURA_EM_MINUTOS = 7 * 60;

/** 22h, em minutos desde a meia-noite. */
export const FECHAMENTO_EM_MINUTOS = 22 * 60;

/** Granularidade da grade horária. Uma aula às 19h03 é erro de digitação. */
export const PASSO_EM_MINUTOS = 5;

/** 420 vira "07:00". */
export function minutosParaHora(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const restante = minutos % 60;
  return `${String(horas).padStart(2, "0")}:${String(restante).padStart(2, "0")}`;
}

/** "07:00" vira 420. */
export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(":");
  return Number(h) * 60 + Number(m);
}

export const ABERTURA = minutosParaHora(ABERTURA_EM_MINUTOS);
export const FECHAMENTO = minutosParaHora(FECHAMENTO_EM_MINUTOS);

/**
 * O horário mais tarde em que uma atividade pode começar: um passo antes do
 * fechamento, porque o término precisa ser posterior. Começar às 22:00 deixaria
 * o usuário sem nenhum término possível.
 */
export const ULTIMO_INICIO = minutosParaHora(
  FECHAMENTO_EM_MINUTOS - PASSO_EM_MINUTOS
);

/**
 * O período letivo vigente.
 *
 * É uma constante porque o calendário acadêmico ainda não existe como tabela.
 * Quando entrar, com datas de início, fim, recesso e feriados, o período passa a
 * ser deduzido da data da reserva em vez de fixado aqui, e a regra deixa de
 * receber este valor pronto.
 *
 * Enquanto isso, ele permite validar o vínculo docente sem construir o
 * calendário inteiro, que é uma entrega bem maior.
 */
export const PERIODO_LETIVO_VIGENTE = "2026.2";
