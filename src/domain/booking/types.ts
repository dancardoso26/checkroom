/**
 * TIPOS DO DOMÍNIO DE RESERVA
 *
 * Este arquivo descreve o vocabulário da regra de negócio: o que é um pedido de
 * reserva, o que precisa ser conhecido para julgá-lo e o que pode dar errado.
 *
 * POR QUE ESTES TIPOS NÃO SÃO OS TIPOS DO BANCO
 *
 * O Supabase gera automaticamente os tipos das tabelas em database.types.ts, e
 * seria tentador usá-los aqui. Não uso, de propósito.
 *
 * Os tipos do banco descrevem linhas: trazem created_at, trazem colunas que a
 * regra não consulta, e mudam sempre que uma migration acrescenta um campo. Os
 * tipos abaixo descrevem exatamente o que a decisão precisa, nem mais nem
 * menos. A consequência prática é que acrescentar uma coluna em bookings não
 * quebra nem sequer toca a regra de negócio.
 *
 * A tradução entre as duas formas acontece na camada de repositórios, que é o
 * único lugar do sistema que conhece as duas.
 */

/**
 * O que o usuário pediu.
 *
 * Datas como Date, e não como string ISO, porque a regra compara instantes. Uma
 * string obrigaria cada comparação a converter antes, e bastaria esquecer uma
 * conversão para que "2026-09-14T19:00" fosse comparado alfabeticamente.
 */
export type BookingRequest = {
  roomId: string;
  professorId: string;
  classId: string;
  purpose: string;
  startsAt: Date;
  endsAt: Date;

  /**
   * Os recursos que a atividade exige, por id.
   *
   * Ids, e não nomes, porque a comparação com o que o espaço oferece precisa
   * ser exata. "Projetor" e "projetor" são o mesmo equipamento para uma pessoa
   * e coisas diferentes para uma comparação de strings.
   */
  requiredResourceIds: string[];
};

/** O espaço, reduzido ao que a decisão examina. */
export type RoomSnapshot = {
  id: string;
  name: string;
  building: string;
  capacity: number;

  /** Ids dos recursos que este espaço oferece, vindos de room_resources. */
  resourceIds: string[];
};

/**
 * A turma, reduzida ao que a decisão examina.
 *
 * O nome evita "class", que é palavra reservada em JavaScript.
 */
export type ClassSnapshot = {
  id: string;
  name: string;
  studentCount: number;
};

/**
 * Uma reserva que já existe e pode conflitar com o pedido.
 *
 * Carrega os três vínculos porque a verificação de conflito é tripla: a mesma
 * reserva pode colidir por espaço, por professor ou por turma, e o motivo
 * precisa ser distinguido para que a mensagem faça sentido ao usuário.
 */
export type ExistingBooking = {
  id: string;
  roomId: string;
  professorId: string;
  classId: string;
  purpose: string;
  startsAt: Date;
  endsAt: Date;
};

/**
 * Tudo o que a regra precisa saber do mundo para decidir.
 *
 * Esta é a peça central do desenho. validateBooking não consulta o banco: ela
 * RECEBE o resultado das consultas. Quem busca é a Server Action, através dos
 * repositórios.
 *
 * A vantagem aparece no arquivo de testes ao lado: cada caso monta um contexto
 * como um objeto literal, sem banco, sem mock de biblioteca e sem esperar
 * conexão. É o que a seção 2.6 da monografia afirma sobre manter as regras
 * separadas do contexto de execução para permitir teste direto.
 */
export type BookingContext = {
  /**
   * Nulo quando o id enviado não corresponde a nenhum espaço. Pode acontecer se
   * o espaço for removido entre o carregamento do formulário e o envio.
   */
  room: RoomSnapshot | null;

  /** Nulo pelo mesmo motivo que room. */
  classGroup: ClassSnapshot | null;

  /**
   * As reservas já gravadas que podem colidir com o pedido.
   *
   * O repositório traz apenas as que envolvem o mesmo espaço, o mesmo professor
   * ou a mesma turma e tocam a mesma faixa de tempo. Trazer a agenda inteira
   * funcionaria igual, mas cresceria sem limite com o uso do sistema.
   *
   * A regra não confia nesse filtro: ela reconfere a sobreposição de cada uma.
   * Se confiasse, um erro na consulta viraria silenciosamente uma reserva
   * duplicada aceita.
   */
  conflictingBookings: ExistingBooking[];

  /**
   * O instante presente, injetado em vez de lido com new Date().
   *
   * Esta linha é o que mantém a função pura. Lendo o relógio por dentro, a
   * mesma entrada produziria resultados diferentes conforme a hora da execução,
   * e o teste de "reserva no passado" só passaria enquanto a data escolhida
   * continuasse no passado. Recebendo o instante, o teste fixa o presente e o
   * resultado é sempre o mesmo.
   */
  now: Date;
};

/**
 * Os motivos pelos quais um pedido pode ser recusado.
 *
 * União discriminada pelo campo "code": o TypeScript usa esse campo para saber
 * quais outros campos existem em cada caso. Ao tratar uma violação de
 * INSUFFICIENT_CAPACITY, o compilador garante que capacity e studentCount estão
 * lá; ao tratar ROOM_CONFLICT, garante que não estão.
 *
 * Repare que nenhuma variante carrega texto para o usuário. O domínio devolve o
 * fato, não a frase. A tradução para português está em messages.ts, e essa
 * separação é o que permite mudar o texto de uma mensagem, ou traduzi-la, sem
 * tocar na regra de negócio.
 */
export type BookingViolation =
  /** Fim antes do início, ou igual a ele. Uma reserva de duração zero ou negativa. */
  | { code: "INVALID_PERIOD" }

  /** O pedido aponta para um espaço que não existe mais. */
  | { code: "ROOM_NOT_FOUND" }

  /** O pedido aponta para uma turma que não existe mais. */
  | { code: "CLASS_NOT_FOUND" }

  /** A finalidade veio vazia ou só com espaços. */
  | { code: "EMPTY_PURPOSE" }

  /** O período começa antes de agora. */
  | { code: "STARTS_IN_THE_PAST" }

  /**
   * O período cai fora do horário de funcionamento da instituição, ou atravessa
   * a virada do dia.
   *
   * Carrega os limites em vez de deixar a mensagem repeti-los: assim o texto
   * exibido acompanha automaticamente qualquer mudança no horário de
   * funcionamento.
   */
  | { code: "OUTSIDE_BUSINESS_HOURS"; opening: string; closing: string }

  /** O espaço já está ocupado no período. */
  | { code: "ROOM_CONFLICT"; conflict: ExistingBooking }

  /** O professor já tem compromisso no período, em qualquer espaço. */
  | { code: "PROFESSOR_CONFLICT"; conflict: ExistingBooking }

  /** A turma já tem aula no período, em qualquer espaço. */
  | { code: "CLASS_CONFLICT"; conflict: ExistingBooking }

  /** O espaço não comporta a turma. */
  | { code: "INSUFFICIENT_CAPACITY"; capacity: number; studentCount: number }

  /** O espaço não oferece um ou mais recursos exigidos. */
  | { code: "MISSING_RESOURCES"; missingResourceIds: string[] };

/**
 * O veredito.
 *
 * Também é união discriminada, e por um motivo específico: o campo "violations"
 * só existe quando valid é false. Isso impede, no compilador, o erro clássico
 * de ler a lista de problemas de uma reserva que foi aprovada, ou de gravar uma
 * reserva sem antes verificar o resultado.
 */
export type BookingValidationResult =
  | { valid: true }
  | { valid: false; violations: BookingViolation[] };
