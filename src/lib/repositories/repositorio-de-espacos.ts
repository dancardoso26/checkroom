import "server-only";
import { criarClienteDoServidor } from "@/lib/supabase/servidor";
import type { EspacoParaReserva } from "@/domain/reservas/tipos";
import type { DadosDoEspaco, TipoDeEspaco } from "@/domain/espacos/espaco";
import {
  classificarErro,
  type ResultadoDaExclusao,
  type ResultadoDaGravacao,
} from "./erros";

export async function buscarEspacoParaReserva(
  espacoId: string,
): Promise<EspacoParaReserva | null> {
  const supabase = await criarClienteDoServidor();

  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, building, capacity, room_resources(resource_id)")
    .eq("id", espacoId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar o espaço ${espacoId}: ${error.message}`);
  }

  if (!data) return null;

  return {
    id: data.id,
    nome: data.name,
    predio: data.building,
    capacidade: data.capacity,
    recursoIds: data.room_resources.map((vinculo) => vinculo.resource_id),
  };
}

export type OpcaoDeEspaco = {
  id: string;
  nome: string;
  predio: string;
  capacidade: number;
  recursoIds: string[];
};

export async function listarEspacos(): Promise<OpcaoDeEspaco[]> {
  const supabase = await criarClienteDoServidor();

  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, building, capacity, room_resources(resource_id)")
    .order("building_number")
    .order("floor")
    .order("room_number");

  if (error) {
    throw new Error(`Falha ao listar os espaços: ${error.message}`);
  }

  return data.map((espaco) => ({
    id: espaco.id,
    nome: espaco.name,
    predio: espaco.building,
    capacidade: espaco.capacity,
    recursoIds: espaco.room_resources.map((vinculo) => vinculo.resource_id),
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
  const supabase = await criarClienteDoServidor();

  const { data, error } = await supabase
    .from("rooms")
    .select(
      "id, name, building_number, floor, room_number, capacity, room_type, room_resources(resource_id)",
    )
    .order("building_number")
    .order("floor")
    .order("room_number");

  if (error) throw new Error(`Falha ao listar os espaços: ${error.message}`);

  return data.map((espaco) => ({
    id: espaco.id,
    codigo: espaco.name,
    predio: espaco.building_number,
    andar: espaco.floor,
    sala: espaco.room_number,
    capacidade: espaco.capacity,
    tipo: espaco.room_type,
    recursoIds: espaco.room_resources.map((vinculo) => vinculo.resource_id),
  }));
}

export async function salvarEspaco(
  dados: DadosDoEspaco,
): Promise<ResultadoDaGravacao> {
  const supabase = await criarClienteDoServidor();

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
  const supabase = await criarClienteDoServidor();

  const { data, error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, falha: classificarErro(error) };
  if (data.length === 0) return { ok: false, falha: "nao_encontrado" };

  return { ok: true };
}
