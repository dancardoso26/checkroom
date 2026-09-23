"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import {
  deleteBooking,
  findBookingOwnership,
} from "@/lib/repositories/bookingRepository";
import { exigirSessao } from "@/lib/sessao";
import { podeGerenciarReserva } from "@/domain/auth/permissoes";

const schema = z.object({ bookingId: z.uuid() });

export type ExclusaoState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export async function excluirReserva(
  _prevState: ExclusaoState,
  formData: FormData
): Promise<ExclusaoState> {
  const parsed = schema.safeParse({ bookingId: formData.get("bookingId") });

  if (!parsed.success) {
    return { status: "error", message: "Reserva inválida." };
  }

  const sessao = await exigirSessao();
  const reserva = await findBookingOwnership(parsed.data.bookingId);

  if (!reserva) {
    return { status: "error", message: "Esta reserva não existe mais." };
  }

  if (!podeGerenciarReserva(sessao, reserva)) {
    return {
      status: "error",
      message: "Esta reserva é de outro professor, e só ele ou a coordenação podem excluí-la.",
    };
  }

  const resultado = await deleteBooking(parsed.data.bookingId);

  if (resultado === "not_found") {
    return { status: "error", message: "Esta reserva não existe mais." };
  }

  revalidatePath("/reservas");

  return { status: "success" };
}
