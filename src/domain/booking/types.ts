export type ActivityType = "class" | "lecture" | "exam" | "defense" | "event";

export type BookingRequest = {
  roomId: string;
  professorId: string;
  classId: string;

  activityType: ActivityType;

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

export type ExistingBooking = {
  id: string;
  roomId: string;
  professorId: string;
  classId: string;
  purpose: string;
  startsAt: Date;
  endsAt: Date;
};

export type BookingContext = {
  /** Nulo quando o espaço foi removido entre o carregamento e o envio. */
  room: RoomSnapshot | null;

  /** Nulo pelo mesmo motivo que room. */
  classGroup: ClassSnapshot | null;

  teachingAssignment: TeachingAssignmentSnapshot | null;

  conflictingBookings: ExistingBooking[];

  now: Date;
};

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

  | { code: "OUTSIDE_BUSINESS_HOURS"; opening: string; closing: string }

  /** O espaço já está ocupado no período. */
  | { code: "ROOM_CONFLICT"; conflict: ExistingBooking }

  /** O professor já tem compromisso no período, em qualquer espaço. */
  | { code: "PROFESSOR_CONFLICT"; conflict: ExistingBooking }

  /** A turma já tem aula no período, em qualquer espaço. */
  | { code: "CLASS_CONFLICT"; conflict: ExistingBooking }

  | { code: "NO_TEACHING_ASSIGNMENT"; term: string }

  /** A atividade é aula e nenhuma disciplina foi informada. */
  | { code: "SUBJECT_REQUIRED" }

  /** O espaço não comporta a turma. */
  | { code: "INSUFFICIENT_CAPACITY"; capacity: number; studentCount: number }

  /** O espaço não oferece um ou mais recursos exigidos. */
  | { code: "MISSING_RESOURCES"; missingResourceIds: string[] };

export type BookingValidationResult =
  | { valid: true }
  | { valid: false; violations: BookingViolation[] };
