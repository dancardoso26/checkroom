"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { cancelBooking } from "@/lib/repositories/bookingRepository";

const schema = z.object({
  bookingId: z.uuid(),
  reason: z
    .string()
    .trim()
    .max(200, "O motivo deve ter no máximo 200 caracteres.")
    .optional(),
});

export type CancelamentoState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

/** Cada resultado da função do banco vira uma frase para o usuário. */
const MENSAGEM: Record<string, string> = {
  not_found: "Esta reserva não existe mais.",
  already_cancelled: "Esta reserva já havia sido cancelada.",
  already_finished: "Não é possível cancelar uma reserva que já terminou.",
};

export async function cancelarReserva(
  _prevState: CancelamentoState,
  formData: FormData
): Promise<CancelamentoState> {
  const parsed = schema.safeParse({
    bookingId: formData.get("bookingId"),
    reason: formData.get("reason") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: "Reserva inválida." };
  }

  const resultado = await cancelBooking(
    parsed.data.bookingId,
    parsed.data.reason ?? null
  );

  if (resultado !== "cancelled") {
    return { status: "error", message: MENSAGEM[resultado] };
  }

  revalidatePath("/reservas");

  return { status: "success" };
}
