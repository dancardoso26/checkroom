import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { RoomSnapshot } from "@/domain/booking/types";

/**
 * A fronteira entre o banco e o domínio: o único lugar que conhece nomes de
 * tabela, snake_case e a biblioteca do Supabase.
 *
 * Existe para conter a troca prevista para 28/09, quando o acesso deixar de usar
 * a chave secreta e passar a usar a sessão do usuário. Sem ela, essa mudança se
 * espalharia por telas e regras que nunca souberam como o dado era buscado.
 */

/**
 * O select traz room_resources aninhado, que o PostgREST resolve em um join só.
 * O achatamento para ids acontece abaixo: a forma aninhada é detalhe de como o
 * dado foi buscado, e o domínio não deve conhecê-la.
 */
export async function findRoomSnapshot(
  roomId: string
): Promise<RoomSnapshot | null> {
  const { data, error } = await supabaseServer
    .from("rooms")
    .select("id, name, building, capacity, room_resources(resource_id)")
    .eq("id", roomId)
    // maybeSingle: single trataria "nenhuma linha" como erro, mas a ausência do
    // espaço é resultado legítimo, e a regra devolve ROOM_NOT_FOUND.
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar o espaço ${roomId}: ${error.message}`);
  }

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    building: data.building,
    capacity: data.capacity,
    resourceIds: data.room_resources.map((vinculo) => vinculo.resource_id),
  };
}

/** Um espaço como aparece no seletor do formulário. */
export type RoomOption = {
  id: string;
  name: string;
  building: string;
  capacity: number;
  resourceIds: string[];
};

/**
 * Traz os recursos junto para a tela avisar sobre capacidade e equipamento
 * durante a escolha. O aviso é conveniência; a recusa continua sendo da regra.
 */
export async function listRooms(): Promise<RoomOption[]> {
  const { data, error } = await supabaseServer
    .from("rooms")
    .select("id, name, building, capacity, room_resources(resource_id)")
    .order("building")
    .order("name");

  if (error) {
    throw new Error(`Falha ao listar os espaços: ${error.message}`);
  }

  return data.map((room) => ({
    id: room.id,
    name: room.name,
    building: room.building,
    capacity: room.capacity,
    resourceIds: room.room_resources.map((vinculo) => vinculo.resource_id),
  }));
}
