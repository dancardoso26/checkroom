import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { BookingWizard } from "./wizard/booking-wizard";

import { listRooms } from "@/lib/repositories/roomRepository";
import { listClasses } from "@/lib/repositories/classRepository";
import { listProfessors } from "@/lib/repositories/professorRepository";
import { listResources } from "@/lib/repositories/resourceRepository";
import { listSubjects } from "@/lib/repositories/subjectRepository";
import { toDateInputValue } from "@/lib/datetime";

/**
 * TELA DE NOVA RESERVA
 *
 * Server Component. Ele carrega os catálogos e entrega ao formulário, que é o
 * componente de cliente.
 *
 * A divisão importa: os repositórios importam "server-only" e usam a chave
 * secreta do Supabase. Se este arquivo tivesse "use client" no topo, o build
 * falharia, e é essa falha proposital que impede a chave de vazar por um import
 * descuidado.
 *
 * As quatro consultas são independentes, então rodam em paralelo. Em sequência,
 * a página só começaria a renderizar depois de quatro idas ao banco enfileiradas.
 */
export const dynamic = "force-dynamic";

export default async function NovaReservaPage() {
  const [rooms, professors, classes, resources, subjects] = await Promise.all([
    listRooms(),
    listProfessors(),
    listClasses(),
    listResources(),
    listSubjects(),
  ]);

  return (
    <>
      <AppHeader />

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="space-y-1">
          <Link
            href="/reservas"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="size-3.5" />
            Reservas
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight">
            Nova reserva
          </h1>

          <p className="text-muted-foreground text-sm">
            Encontre um espaço compatível com a atividade acadêmica.
          </p>
        </div>

        <BookingWizard
          rooms={rooms}
          professors={professors}
          classes={classes}
          resources={resources}
          subjects={subjects}
          // A data de hoje é calculada aqui, no servidor, e não dentro do
          // componente de cliente. Assim o valor inicial do campo é o mesmo na
          // renderização do servidor e na hidratação do navegador.
          hoje={toDateInputValue(new Date())}
        />
      </main>
    </>
  );
}
