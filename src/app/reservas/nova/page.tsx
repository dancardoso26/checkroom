import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { BookingWizard } from "./wizard/booking-wizard";

import { listRooms } from "@/lib/repositories/roomRepository";
import { listClasses } from "@/lib/repositories/classRepository";
import { listProfessors } from "@/lib/repositories/professorRepository";
import { listResources } from "@/lib/repositories/resourceRepository";
import {
  listSubjects,
  listTeachingAssignments,
} from "@/lib/repositories/subjectRepository";
import { PERIODO_LETIVO_VIGENTE } from "@/domain/booking/businessHours";
import { toDateInputValue } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function NovaReservaPage() {
  const [rooms, professors, classes, resources, subjects, assignments] =
    await Promise.all([
      listRooms(),
      listProfessors(),
      listClasses(),
      listResources(),
      listSubjects(),
      listTeachingAssignments(PERIODO_LETIVO_VIGENTE),
    ]);

  return (
    <>
      <AppHeader />

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="space-y-1">
          <Link
            href="/reservas"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm mb-6 rounded-[6px] px-2 py-1 hover:bg-accent/50 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Voltar
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight">
            Nova reserva
          </h1>

          <p className="text-muted-foreground text-sm">
            Reserve um espaço para sua atividade acadêmica.
          </p>
        </div>

        <BookingWizard
          rooms={rooms}
          professors={professors}
          classes={classes}
          resources={resources}
          subjects={subjects}
          assignments={assignments}
          hoje={toDateInputValue(new Date())}
        />
      </main>
    </>
  );
}
