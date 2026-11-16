"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import {
  excluirReservaNoBanco,
  buscarDadosParaAvisoDaReserva,
  buscarDonoDaReserva,
} from "@/lib/repositories/repositorio-de-reservas";
import { exigirSessao } from "@/lib/sessao";
import { podeGerenciarReserva } from "@/domain/auth/permissoes";
import { notificarProfessor } from "./notificar";

const schema = z.object({ reservaId: z.uuid() });

export type EstadoDaExclusao =
  | { status: "inicial" }
  | { status: "sucesso" }
  | { status: "erro"; message: string };

export async function excluirReserva(
  _estadoAnterior: EstadoDaExclusao,
  dadosDoFormulario: FormData,
): Promise<EstadoDaExclusao> {
  const validado = schema.safeParse({
    reservaId: dadosDoFormulario.get("reservaId"),
  });

  if (!validado.success) {
    return { status: "erro", message: "Reserva inválida." };
  }

  const sessao = await exigirSessao();
  const reserva = await buscarDonoDaReserva(validado.data.reservaId);

  if (!reserva) {
    return { status: "erro", message: "Esta reserva não existe mais." };
  }

  if (!podeGerenciarReserva(sessao, reserva)) {
    return {
      status: "erro",
      message:
        "Esta reserva é de outro professor, e só ele ou a coordenação podem excluí-la.",
    };
  }

  const aviso = await buscarDadosParaAvisoDaReserva(validado.data.reservaId);
  const resultado = await excluirReservaNoBanco(validado.data.reservaId);

  if (resultado === "not_found") {
    return { status: "erro", message: "Esta reserva não existe mais." };
  }

  if (aviso?.ativa && aviso.inicio > new Date()) {
    await notificarProfessor(
      validado.data.reservaId,
      "excluida",
      sessao.nome,
      aviso,
    );
  }

  revalidatePath("/reservas");

  return { status: "sucesso" };
}
