"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import {
  cancelarReservaNoBanco,
  buscarDonoDaReserva,
} from "@/lib/repositories/repositorio-de-reservas";
import { exigirSessao } from "@/lib/sessao";
import { podeGerenciarReserva } from "@/domain/auth/permissoes";
import { notificarProfessor } from "./notificar";

const schema = z.object({
  reservaId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(1, "Informe o motivo do cancelamento.")
    .max(200, "O motivo deve ter no máximo 200 caracteres."),
});

export type EstadoDoCancelamento =
  | { status: "inicial" }
  | { status: "sucesso" }
  | { status: "erro"; message: string };

const MENSAGEM: Record<string, string> = {
  not_found: "Esta reserva não existe mais.",
  already_cancelled: "Esta reserva já havia sido cancelada.",
  already_finished: "Não é possível cancelar uma reserva que já terminou.",
};

export async function cancelarReserva(
  _estadoAnterior: EstadoDoCancelamento,
  dadosDoFormulario: FormData,
): Promise<EstadoDoCancelamento> {
  const validado = schema.safeParse({
    reservaId: dadosDoFormulario.get("reservaId"),
    reason: dadosDoFormulario.get("reason") ?? "",
  });

  if (!validado.success) {
    const motivo = validado.error.issues.find((i) => i.path[0] === "reason");
    return { status: "erro", message: motivo?.message ?? "Reserva inválida." };
  }

  const sessao = await exigirSessao();
  const reserva = await buscarDonoDaReserva(validado.data.reservaId);

  if (!reserva) {
    return { status: "erro", message: MENSAGEM.not_found };
  }

  if (!podeGerenciarReserva(sessao, reserva)) {
    return {
      status: "erro",
      message:
        "Esta reserva é de outro professor, e só ele ou o administrador podem cancelá-la.",
    };
  }

  const resultado = await cancelarReservaNoBanco(
    validado.data.reservaId,
    validado.data.reason,
  );

  if (resultado !== "cancelled") {
    return { status: "erro", message: MENSAGEM[resultado] };
  }

  await notificarProfessor(validado.data.reservaId, "cancelada", sessao.nome);

  revalidatePath("/reservas");

  return { status: "sucesso" };
}
