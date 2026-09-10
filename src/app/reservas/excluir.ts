"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { deleteBooking } from "@/lib/repositories/bookingRepository";

/**
 * Server Action de exclusão.
 *
 * A reserva é apagada do banco, e os recursos vinculados somem junto pelo
 * "on delete cascade".
 *
 * QUANDO EXCLUIR, E QUANDO CANCELAR
 *
 * São operações diferentes, e confundi-las custa histórico. Cancelar diz que a
 * atividade não vai acontecer, e é um fato acadêmico que merece registro.
 * Excluir diz que a reserva não deveria ter existido: erro de digitação, dado de
 * teste, duplicata.
 *
 * A confirmação na tela sugere cancelar a quem só quer desmarcar a aula, para
 * que a escolha entre as duas seja consciente.
 *
 * SEM AUTENTICAÇÃO, É A MAIS PERIGOSA DAS TRÊS
 *
 * Como toda Server Action, esta é um endpoint HTTP público e hoje não verifica
 * quem chama. Criar uma reserva indevida é um estorvo, cancelar a de outra
 * pessoa é destrutivo, e excluir não deixa nem o registro de que existiu. Em
 * 28/09 a ação passa a exigir que quem exclui seja quem registrou a reserva ou
 * a coordenação.
 *
 * NÃO HÁ COMO REGISTRAR QUEM EXCLUIU
 *
 * A linha que guardaria esse registro é justamente a que se apaga. Quando os
 * logs de auditoria existirem como tabela própria, a exclusão passa a gravar um
 * evento lá antes de remover a reserva.
 */

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

  const resultado = await deleteBooking(parsed.data.bookingId);

  if (resultado === "not_found") {
    return { status: "error", message: "Esta reserva não existe mais." };
  }

  revalidatePath("/reservas");

  return { status: "success" };
}
