import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RoomSnapshot } from "@/domain/booking/types";
import type { DadosDoEspaco, TipoDeEspaco } from "@/domain/espacos/espaco";
import {
  classificarErro,
  type ResultadoDaExclusao,
  type ResultadoDaGravacao,
} from "./erros";

export async function findRoomSnapshot(
  roomId: string
): Promise<RoomSnapshot | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, building, capacity, room_resources(resource_id)")
    .eq("id", roomId)
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

export type RoomOption = {
  id: string;
  name: string;
  building: string;
  capacity: number;
  resourceIds: string[];
};

export async function listRooms(): Promise<RoomOption[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, building, capacity, room_resources(resource_id)")
    .order("building_number")
    .order("floor")
    .order("room_number");

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

export type EspacoGerenciado = {
  id: string;
  codigo: string;
  predio: number;
  andar: string;
  sala: number;
  capacidade: number;
  tipo: TipoDeEspaco;
  recursoIds: string[];
};

export async function listarEspacosParaGestao(): Promise<EspacoGerenciado[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("rooms")
    .select(
      "id, name, building_number, floor, room_number, capacity, room_type, room_resources(resource_id)"
    )
    .order("building_number")
    .order("floor")
    .order("room_number");

  if (error) throw new Error(`Falha ao listar os espaços: ${error.message}`);

  return data.map((room) => ({
    id: room.id,
    codigo: room.name,
    predio: room.building_number,
    andar: room.floor,
    sala: room.room_number,
    capacidade: room.capacity,
    tipo: room.room_type,
    recursoIds: room.room_resources.map((vinculo) => vinculo.resource_id),
  }));
}

export async function salvarEspaco(
  dados: DadosDoEspaco
): Promise<ResultadoDaGravacao> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("salvar_espaco", {
    p_id: dados.id,
    p_predio: dados.predio,
    p_andar: dados.andar,
    p_sala: dados.sala,
    p_capacidade: dados.capacidade,
    p_tipo: dados.tipo,
    p_recursos: dados.recursoIds,
  });

  if (error) {
    if (/não encontrado/.test(error.message)) {
      return { ok: false, falha: "nao_encontrado" };
    }
    console.error("Falha ao salvar o espaço:", error);
    return { ok: false, falha: classificarErro(error) };
  }

  return { ok: true, id: data };
}

export async function excluirEspaco(id: string): Promise<ResultadoDaExclusao> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, falha: classificarErro(error) };
  if (data.length === 0) return { ok: false, falha: "nao_encontrado" };

  return { ok: true };
}
