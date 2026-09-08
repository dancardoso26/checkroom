/**
 * O vocabulário da regra de reserva: o que é um pedido, o que a decisão precisa
 * saber e o que pode dar errado.
 *
 * Estes tipos são propositalmente diferentes dos gerados em database.types.ts.
 * Os do banco descrevem linhas inteiras e mudam a cada migration; estes
 * descrevem só o que a decisão examina. Acrescentar uma coluna em bookings não
 * toca a regra de negócio.
 */

/**
 * O que acontece no espaço.
 *
 * Só a aula exige disciplina e vínculo docente. Antes disso existir, a
 * disciplina era opcional para acomodar defesa de TCC e seminário, e bastava
 * deixá-la vazia para contornar a verificação do vínculo.
 */
export type ActivityType = "class" | "lecture" | "exam" | "defense" | "event";

/**
 * Datas como Date, e não string ISO, porque a regra compara instantes. Com
 * string, bastaria esquecer uma conversão para comparar alfabeticamente.
 */
export type BookingRequest = {
  roomId: string;
  professorId: string;
  classId: string;

  activityType: ActivityType;

  /**
   * A disciplina, obrigatória quando a atividade é aula e ignorada nos demais
   * tipos, que não pertencem a nenhuma.
   */
  subjectId: string | null;

  purpose: string;
  startsAt: Date;
  endsAt: Date;

  /** Ids, e não nomes: "Projetor" e "projetor" seriam recursos diferentes. */
  requiredResourceIds: string[];
};

/** O espaço, reduzido ao que a decisão examina. */
export type RoomSnapshot = {
  id: string;
  name: string;
  building: string;
  capacity: number;
  /** Recursos que este espaço oferece, vindos de room_resources. */
  resourceIds: string[];
};

/**
 * A confirmação de que o professor leciona a disciplina para a turma naquele
 * período. A regra só precisa saber que existe, então carrega apenas o que a
 * mensagem de erro usa.
 */
export type TeachingAssignmentSnapshot = {
  professorId: string;
  subjectId: string;
  classId: string;
  term: string;
};

/** A turma. O nome evita "class", palavra reservada em JavaScript. */
export type ClassSnapshot = {
  id: string;
  name: string;
  studentCount: number;
};

/**
 * Uma reserva já gravada que pode conflitar com o pedido.
 *
 * Carrega os três vínculos porque o conflito é triplo, e o motivo precisa ser
 * distinguido para que a mensagem faça sentido.
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
 * Tudo o que a regra precisa saber do mundo. Ela recebe o resultado das
 * consultas em vez de fazê-las, e é isso que permite a cada teste montar um
 * contexto como objeto literal, sem banco e sem mock.
 */
export type BookingContext = {
  /** Nulo quando o espaço foi removido entre o carregamento e o envio. */
  room: RoomSnapshot | null;

  /** Nulo pelo mesmo motivo que room. */
  classGroup: ClassSnapshot | null;

  /**
   * O vínculo entre professor, disciplina e turma no período letivo.
   *
   * Nulo quando o pedido não informa disciplina, e também quando informa mas o
   * vínculo não existe. A regra distingue os dois casos pelo subjectId do
   * pedido: sem disciplina não há o que verificar; com disciplina e sem vínculo,
   * a combinação é academicamente impossível.
   */
  teachingAssignment: TeachingAssignmentSnapshot | null;

  /**
   * Reservas que podem colidir. O repositório já filtra por período para o
   * custo não crescer com a agenda, mas a regra reconfere cada uma.
   */
  conflictingBookings: ExistingBooking[];

  /**
   * O instante presente, injetado em vez de lido com new Date(). É o que mantém
   * a função pura: o teste fixa o presente e o resultado nunca muda com o
   * passar do tempo.
   */
  now: Date;
};

/**
 * Os motivos de recusa, como união discriminada por "code". O TypeScript usa
 * esse campo para saber quais outros campos existem em cada caso.
 *
 * Nenhuma variante carrega texto: o domínio devolve o fato, e messages.ts faz a
 * frase. Assim reescrever uma mensagem não toca a regra.
 */
export type BookingViolation =
  /** Fim antes do início, ou igual a ele. */
  | { code: "INVALID_PERIOD" }

  /** O espaço não existe mais. */
  | { code: "ROOM_NOT_FOUND" }

  /** A turma não existe mais. */
  | { code: "CLASS_NOT_FOUND" }

  /** A finalidade veio vazia. */
  | { code: "EMPTY_PURPOSE" }

  /** O período começa antes de agora. */
  | { code: "STARTS_IN_THE_PAST" }

  /**
   * Fora do horário de funcionamento, ou atravessando a virada do dia. Carrega
   * os limites para a mensagem acompanhar qualquer mudança no expediente.
   */
  | { code: "OUTSIDE_BUSINESS_HOURS"; opening: string; closing: string }

  /** O espaço já está ocupado no período. */
  | { code: "ROOM_CONFLICT"; conflict: ExistingBooking }

  /** O professor já tem compromisso no período, em qualquer espaço. */
  | { code: "PROFESSOR_CONFLICT"; conflict: ExistingBooking }

  /** A turma já tem aula no período, em qualquer espaço. */
  | { code: "CLASS_CONFLICT"; conflict: ExistingBooking }

  /**
   * O professor não leciona aquela disciplina para aquela turma no período. É a
   * verificação que torna o modelo exclusivo de educação: uma agenda genérica
   * não tem onde encaixar um vínculo entre docente, disciplina e turma.
   */
  | { code: "NO_TEACHING_ASSIGNMENT"; term: string }

  /** A atividade é aula e nenhuma disciplina foi informada. */
  | { code: "SUBJECT_REQUIRED" }

  /** O espaço não comporta a turma. */
  | { code: "INSUFFICIENT_CAPACITY"; capacity: number; studentCount: number }

  /** O espaço não oferece um ou mais recursos exigidos. */
  | { code: "MISSING_RESOURCES"; missingResourceIds: string[] };

/**
 * O veredito. União discriminada para que "violations" só exista quando valid é
 * false: o compilador impede ler a lista de problemas de uma reserva aprovada,
 * ou gravar sem antes verificar.
 */
export type BookingValidationResult =
  | { valid: true }
  | { valid: false; violations: BookingViolation[] };
