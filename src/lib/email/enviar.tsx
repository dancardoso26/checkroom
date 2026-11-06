import "server-only";

import { Resend } from "resend";

import { podeReceber } from "./destinatario";
import { lerRemetente } from "./remetente";
import {
  EmailDeChamadoResolvido,
  EmailDeNovaPalestra,
  EmailDeReserva,
  type DadosDaNovaPalestra,
  type DadosDaReserva,
  type DadosDoChamadoResolvido,
} from "./template";

const chave = process.env.RESEND_API_KEY?.trim();
const remetente = lerRemetente(process.env.RESEND_FROM);

const resend = chave ? new Resend(chave) : null;

type Mensagem = { to: string; subject: string; react: React.ReactElement };

async function enviar(mensagens: Mensagem[]): Promise<void> {
  if (!resend) {
    console.warn("RESEND_API_KEY não definida: notificação não enviada.");
    return;
  }

  const validas = mensagens.filter((m) => {
    const ok = podeReceber(m.to);
    if (!ok) console.info(`Notificação não enviada: ${m.to} é endereço fictício.`);
    return ok;
  });

  for (let i = 0; i < validas.length; i += 100) {
    const lote = validas.slice(i, i + 100).map((m) => ({ from: remetente, ...m }));

    try {
      const { error } =
        lote.length === 1
          ? await resend.emails.send(lote[0])
          : await resend.batch.send(lote);

      if (error) console.error("Falha ao enviar notificação:", error);
    } catch (falha) {
      console.error("Falha ao enviar notificação:", falha);
    }
  }
}

export async function avisarSobreReserva(
  destinatario: string,
  cancelada: boolean,
  dados: DadosDaReserva
): Promise<void> {
  await enviar([
    {
      to: destinatario,
      subject: cancelada
        ? `Reserva cancelada: ${dados.finalidade}`
        : `Nova reserva: ${dados.finalidade}`,
      react: <EmailDeReserva cancelada={cancelada} dados={dados} />,
    },
  ]);
}

export async function avisarSobreChamadoResolvido(
  destinatario: string,
  dados: DadosDoChamadoResolvido
): Promise<void> {
  await enviar([
    {
      to: destinatario,
      subject: `Chamado resolvido: ${dados.espaco}`,
      react: <EmailDeChamadoResolvido dados={dados} />,
    },
  ]);
}

export async function avisarSobreNovaPalestra(
  destinatarios: string[],
  dados: DadosDaNovaPalestra
): Promise<void> {
  await enviar(
    destinatarios.map((to) => ({
      to,
      subject: `Nova palestra: ${dados.titulo}`,
      react: <EmailDeNovaPalestra dados={dados} />,
    }))
  );
}
