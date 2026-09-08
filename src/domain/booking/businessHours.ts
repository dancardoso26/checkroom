/**
 * HORÁRIO DE FUNCIONAMENTO DA INSTITUIÇÃO
 *
 * A universidade abre às 7h e fecha às 22h. Fora disso não há portaria, não há
 * limpeza e não há suporte técnico, então uma reserva às 23h seria aceita pelo
 * sistema e recusada pela realidade.
 *
 * POR QUE ISTO É REGRA, E NÃO CONFIGURAÇÃO DE CAMPO
 *
 * A forma mais rápida de impedir esses horários seria colocar min="07:00" e
 * max="22:00" nos campos do formulário e parar por aí. Os atributos existem, e
 * são úteis: evitam que alguém escolha um horário inválido sem perceber.
 *
 * Mas atributo de HTML é sugestão, não garantia. Qualquer pessoa remove um
 * atributo pelo inspetor do navegador, e a regra de negócio deste sistema já
 * tem um teste que faz exatamente isso para provar que a recusa vem do
 * servidor. Uma restrição que só existe na tela não é uma restrição.
 *
 * POR QUE OS VALORES FICAM AQUI, E NÃO ESPALHADOS
 *
 * Os mesmos números aparecem em três lugares: nos atributos dos campos, na
 * verificação da regra e na mensagem exibida ao usuário. Declarados uma vez,
 * mudar o horário de funcionamento é editar duas linhas. Repetidos, seria
 * caçar "07:00" pelo projeto e descobrir o que ficou para trás quando alguém
 * reclamar.
 *
 * QUANDO ISTO DEIXAR DE SER CONSTANTE
 *
 * Se o sistema atender mais de um campus, ou se o sábado passar a ter horário
 * diferente, estes valores saem daqui e viram dados no banco, entrando no
 * contexto que a regra recebe. A estrutura já permite essa troca: nenhum outro
 * arquivo conhece os números, todos importam daqui.
 */

/** Abertura, em minutos desde a meia-noite. 7h = 420. */
export const ABERTURA_EM_MINUTOS = 7 * 60;

/** Fechamento, em minutos desde a meia-noite. 22h = 1320. */
export const FECHAMENTO_EM_MINUTOS = 22 * 60;

/**
 * O menor intervalo que o formulário aceita, em minutos.
 *
 * Cinco minutos é a granularidade da grade horária da instituição. Sem isto, o
 * seletor de hora do navegador oferece passos de um minuto, e uma aula que
 * começa às 19h03 é sempre erro de digitação, nunca intenção.
 */
export const PASSO_EM_MINUTOS = 5;

/** Ex.: 420 vira "07:00". Formato exigido pelos campos de hora do HTML. */
export function minutosParaHora(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const restante = minutos % 60;
  return `${String(horas).padStart(2, "0")}:${String(restante).padStart(2, "0")}`;
}

export const ABERTURA = minutosParaHora(ABERTURA_EM_MINUTOS);
export const FECHAMENTO = minutosParaHora(FECHAMENTO_EM_MINUTOS);

/** "07:00" vira 420. O inverso de minutosParaHora. */
export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(":");
  return Number(h) * 60 + Number(m);
}

/**
 * O horário mais tarde em que uma atividade pode começar.
 *
 * Um passo antes do fechamento, porque o término precisa ser posterior ao
 * início. Começar às 22:00 não deixaria nenhum término possível, e o formulário
 * conduziria o usuário a um estado sem saída que só o servidor recusaria.
 */
export const ULTIMO_INICIO = minutosParaHora(
  FECHAMENTO_EM_MINUTOS - PASSO_EM_MINUTOS
);
