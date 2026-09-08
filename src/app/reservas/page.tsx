import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listUpcomingBookings } from "@/lib/repositories/bookingRepository";
import { formatFullDate, formatTimeRange } from "@/lib/datetime";
import type { BookingListItem } from "@/lib/repositories/bookingRepository";

/**
 * LISTAGEM DE RESERVAS
 *
 * Server Component: esta função roda no servidor, e o que chega ao navegador é
 * apenas o HTML resultante.
 *
 * A consequência mais importante é o await direto no repositório, algumas
 * linhas abaixo. Não existe endpoint de API, nem useEffect, nem estado de
 * carregamento, nem a chave do banco viajando até o cliente. A página é uma
 * função que devolve marcação, e a consulta acontece antes de ela existir.
 *
 * É essa característica do App Router que a seção 2.2 da monografia descreve, e
 * esta tela é a demonstração concreta dela.
 */

/**
 * force-dynamic desliga o cache da rota.
 *
 * Por padrão, o Next tentaria renderizar esta página uma vez e reaproveitar o
 * resultado. Para uma agenda de salas isso seria errado: o professor criaria
 * uma reserva e voltaria para uma lista sem ela.
 *
 * A Server Action já chama revalidatePath depois de gravar, o que resolveria o
 * caso principal. A instrução aqui cobre também as gravações que acontecem por
 * fora, como um INSERT feito direto no painel do Supabase durante a validação
 * com o orientador.
 */
export const dynamic = "force-dynamic";

export default async function ReservasPage() {
  const reservas = await listUpcomingBookings();

  // Agrupar por dia é o que transforma uma lista corrida em uma agenda. Sem
  // isso, a data se repetiria em cada linha e a leitura exigiria comparar
  // valores em vez de reconhecer blocos.
  const porDia = agruparPorDia(reservas);

  return (
    <>
      <AppHeader />

      <main className="mx-auto max-w-5xl space-y-8 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Reservas</h1>
            <p className="text-muted-foreground text-sm">
              Espaços reservados a partir de agora.
            </p>
          </div>

          <Button asChild>
            <Link href="/reservas/nova">Nova reserva</Link>
          </Button>
        </div>

        {reservas.length === 0 ? (
          <EstadoVazio />
        ) : (
          <div className="space-y-8">
            {porDia.map(({ dia, itens }) => (
              <section key={dia} className="space-y-3">
                {/* first-letter:uppercase porque o Intl devolve o dia da semana
                    em minúscula em português: "segunda-feira, 14 de setembro". */}
                <h2 className="text-muted-foreground text-sm font-semibold first-letter:uppercase">
                  {dia}
                </h2>

                <div className="space-y-3">
                  {itens.map((reserva) => (
                    <CartaoReserva key={reserva.id} reserva={reserva} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

/**
 * Agrupa as reservas por dia, preservando a ordem cronológica.
 *
 * Um Map, e não um objeto comum, porque o Map garante a ordem de inserção. Um
 * objeto com chaves de texto também preservaria neste caso, mas depender disso
 * é frágil: basta uma chave que pareça número para a ordem mudar sem aviso.
 *
 * A lista já vem ordenada por starts_at do banco, então percorrer uma vez
 * basta: reservas do mesmo dia chegam em sequência.
 */
function agruparPorDia(reservas: BookingListItem[]) {
  const grupos = new Map<string, BookingListItem[]>();

  for (const reserva of reservas) {
    const dia = formatFullDate(reserva.startsAt);
    const existente = grupos.get(dia);

    if (existente) {
      existente.push(reserva);
    } else {
      grupos.set(dia, [reserva]);
    }
  }

  return [...grupos].map(([dia, itens]) => ({ dia, itens }));
}

function CartaoReserva({ reserva }: { reserva: BookingListItem }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="font-medium">{reserva.purpose}</p>

          <p className="text-muted-foreground text-sm">
            {reserva.building} · {reserva.roomName}
          </p>

          <p className="text-muted-foreground text-sm">
            {reserva.professorName} · {reserva.className}
          </p>

          {reserva.resourceNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {reserva.resourceNames.map((nome) => (
                <Badge key={nome} variant="secondary">
                  {nome}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* <time> com dateTime em formato legível por máquina. É o que permite a
            um leitor de tela, ou a um buscador, interpretar o horário como data
            e não como texto solto. */}
        <time
          dateTime={reserva.startsAt.toISOString()}
          className="text-primary text-sm font-semibold whitespace-nowrap"
        >
          {formatTimeRange(reserva.startsAt, reserva.endsAt)}
        </time>
      </CardContent>
    </Card>
  );
}

function EstadoVazio() {
  return (
    <Card>
      <CardContent className="space-y-3 py-10 text-center">
        <p className="font-medium">Nenhuma reserva futura</p>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">
          As reservas que já terminaram não aparecem aqui. Crie a primeira para
          vê-la nesta agenda.
        </p>
        <Button asChild className="mt-2">
          <Link href="/reservas/nova">Nova reserva</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
