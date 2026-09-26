import "server-only";

import { Resend } from "resend";

import { podeReceber } from "./destinatario";
import { lerRemetente } from "./remetente";
import { EmailDeReserva, type DadosDaReserva } from "./template";

const chave = process.env.RESEND_API_KEY?.trim();
const remetente = lerRemetente(process.env.RESEND_FROM);

// Sem chave configurada o sistema segue funcionando e apenas não avisa: e-mail
// é consequência da reserva, não condição para ela.
const resend = chave ? new Resend(chave) : null;

export async function avisarSobreReserva(
  destinatario: string,
  cancelada: boolean,
  dados: DadosDaReserva
): Promise<void> {
  if (!resend) {
    console.warn("RESEND_API_KEY não definida: notificação não enviada.");
    return;
  }

  if (!podeReceber(destinatario)) {
    console.info(`Notificação não enviada: ${destinatario} é endereço fictício.`);
    return;
  }

  const assunto = cancelada
    ? `Reserva cancelada: ${dados.finalidade}`
    : `Nova reserva: ${dados.finalidade}`;

  try {
    const { error } = await resend.emails.send({
      from: remetente,
      to: destinatario,
      subject: assunto,
      react: <EmailDeReserva cancelada={cancelada} dados={dados} />,
    });

    if (error) console.error("Falha ao enviar notificação:", error);
  } catch (falha) {
    // Nunca propaga: um serviço externo fora do ar não pode impedir um
    // professor de reservar uma sala.
    console.error("Falha ao enviar notificação:", falha);
  }
}
