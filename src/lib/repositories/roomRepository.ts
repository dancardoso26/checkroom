import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { RoomSnapshot } from "@/domain/booking/types";

/**
 * REPOSITÓRIO DE ESPAÇOS
 *
 * A camada de repositórios é a fronteira entre o banco e o domínio. Ela é o
 * único lugar do sistema que conhece nomes de tabela, formato de coluna e a
 * biblioteca do Supabase.
 *
 * POR QUE ESSA FRONTEIRA EXISTE
 *
 * A regra de negócio trabalha com RoomSnapshot, um objeto pequeno com o que a
 * decisão precisa. O banco devolve linhas com snake_case, created_at e uma
 * lista aninhada de recursos. A tradução entre as duas formas acontece aqui, e
 * só aqui.
 *
 * A consequência aparece em 28/09. Quando a autenticação entrar, o cliente do
 * Supabase deixa de usar a chave secreta e passa a usar a sessão do usuário.
 * Essa troca acontece em src/lib/supabase/server.ts e nestes arquivos, e não se
 * espalha por telas e regras que nunca souberam como o dado era buscado.
 */

/**
 * Carrega o espaço no formato que a regra de negócio consome.
 *
 * O select traz room_resources aninhado em vez de fazer duas consultas. O
 * PostgREST, que é a camada REST do Supabase, resolve o relacionamento em um
 * único join no banco, e o resultado chega como:
 *
 *   { id: "...", capacity: 45, room_resources: [{ resource_id: "..." }] }
 *
 * O achatamento para o array simples de ids acontece logo abaixo, porque essa
 * forma aninhada é um detalhe de como o dado foi buscado, e o domínio não deve
 * conhecê-la.
 */
export async function findRoomSnapshot(
  roomId: string
): Promise<RoomSnapshot | null> {
  const { data, error } = await supabaseServer
    .from("rooms")
    .select("id, name, building, capacity, room_resources(resource_id)")
    .eq("id", roomId)
    // maybeSingle, e não single: single trata "nenhuma linha" como erro, e aqui
    // a ausência do espaço é um resultado legítimo. Quem decide o que fazer com
    // isso é a regra, que devolve a violação ROOM_NOT_FOUND.
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
 * Lista os espaços para o formulário.
 *
 * Traz os recursos junto, e não só id e nome, para que a tela possa avisar
 * sobre capacidade e equipamento enquanto o professor ainda está escolhendo,
 * em vez de só na hora de enviar. A regra continua sendo a autoridade: o aviso
 * na tela é conveniência, a recusa é decisão.
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
