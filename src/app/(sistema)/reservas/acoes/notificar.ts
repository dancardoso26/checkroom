import "server-only";

import { formatarPeriodo, chaveDoDiaLocal } from "@/lib/datas";
import { enderecoDoSite } from "@/lib/endereco-do-site";
import { avisarSobreReserva } from "@/lib/email/enviar";
import type { SituacaoDaReserva } from "@/lib/email/template";
import {
  buscarDadosParaAvisoDaReserva,
  type DadosParaNotificacao,
} from "@/lib/repositories/repositorio-de-reservas";

const PREFIXO_DE_TESTE = "[e2e]";

export async function notificarProfessor(
  reservaId: string,
  situacao: SituacaoDaReserva,
  registradoPor: string,
  dadosLidosAntes?: DadosParaNotificacao | null,
): Promise<void> {
  const dados =
    dadosLidosAntes === undefined
      ? await buscarDadosParaAvisoDaReserva(reservaId)
      : dadosLidosAntes;

  if (!dados || dados.finalidade.startsWith(PREFIXO_DE_TESTE)) return;

  await avisarSobreReserva(dados.professorEmail, situacao, {
    professorNome: dados.professorNome,
    finalidade: dados.finalidade,
    espaco: dados.espaco,
    periodo: formatarPeriodo(dados.inicio, dados.fim),
    turma: dados.turma,
    registradoPor,
    motivo: dados.motivo,
    link: `${enderecoDoSite()}/reservas?data=${chaveDoDiaLocal(dados.inicio)}&destaque=${reservaId}`,
  });
}
