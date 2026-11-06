import type { CalendarioDoDia } from "@/domain/calendario/calendario";

export type ActivityType = "class" | "lecture" | "exam" | "event";

export type BookingRequest = {
  roomId: string;
  professorId: string;
  classId: string;

  activityType: ActivityType;

  subjectId: string | null;

  purpose: string;
  startsAt: Date;
  endsAt: Date;

  requiredResourceIds: string[];
};

export type RoomSnapshot = {
  id: string;
  name: string;
  building: string;
  capacity: number;
  resourceIds: string[];
};

export type TeachingAssignmentSnapshot = {
  professorId: string;
  subjectId: string;
  classId: string;
  term: string;
};

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
  room: RoomSnapshot | null;

  classGroup: ClassSnapshot | null;

  teachingAssignment: TeachingAssignmentSnapshot | null;

  conflictingBookings: ExistingBooking[];

  now: Date;

  calendario?: CalendarioDoDia;
};

export type BookingViolation =
  | { code: "INVALID_PERIOD" }

  | { code: "ROOM_NOT_FOUND" }

  | { code: "CLASS_NOT_FOUND" }

  | { code: "EMPTY_PURPOSE" }

  | { code: "STARTS_IN_THE_PAST" }

  | { code: "OUTSIDE_BUSINESS_HOURS"; opening: string; closing: string }

  | { code: "ROOM_CONFLICT"; conflict: ExistingBooking }

  | { code: "PROFESSOR_CONFLICT"; conflict: ExistingBooking }

  | { code: "CLASS_CONFLICT"; conflict: ExistingBooking }

  | { code: "NO_TEACHING_ASSIGNMENT"; term: string }

  | { code: "SUBJECT_REQUIRED" }

  | { code: "INSUFFICIENT_CAPACITY"; capacity: number; studentCount: number }

  | { code: "MISSING_RESOURCES"; missingResourceIds: string[] }

  | { code: "OUTSIDE_ACADEMIC_TERM" }

  | { code: "DATE_BLOCKED"; reason: string }

  | { code: "ROOM_BLOCKED"; reason: string };

export type BookingValidationResult =
  | { valid: true }
  | { valid: false; violations: BookingViolation[] };
