import "server-only";

import { formatPeriod, localDayKey } from "@/lib/datetime";
import { enderecoDoSite } from "@/lib/endereco-do-site";
import { avisarSobreReserva } from "@/lib/email/enviar";
import type { SituacaoDaReserva } from "@/lib/email/template";
import {
  findBookingNotificationData,
  type DadosParaNotificacao,
} from "@/lib/repositories/repositorio-de-reservas";

const PREFIXO_DE_TESTE = "[e2e]";

export async function notificarProfessor(
  bookingId: string,
  situacao: SituacaoDaReserva,
  registradoPor: string,
  dadosLidosAntes?: DadosParaNotificacao | null
): Promise<void> {
  const dados =
    dadosLidosAntes === undefined
      ? await findBookingNotificationData(bookingId)
      : dadosLidosAntes;

  if (!dados || dados.finalidade.startsWith(PREFIXO_DE_TESTE)) return;

  await avisarSobreReserva(dados.professorEmail, situacao, {
    professorNome: dados.professorNome,
    finalidade: dados.finalidade,
    espaco: dados.espaco,
    periodo: formatPeriod(dados.startsAt, dados.endsAt),
    turma: dados.turma,
    registradoPor,
    motivo: dados.motivo,
    link: `${enderecoDoSite()}/reservas?data=${localDayKey(dados.startsAt)}&destaque=${bookingId}`,
  });
}
