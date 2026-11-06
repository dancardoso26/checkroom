"use client";

import { Campo, DialogoDeFormulario } from "@/components/formulario";
import { SelecaoComPesquisa } from "@/components/selecao-com-pesquisa";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PRIORIDADES,
  ROTULO_DA_PRIORIDADE,
  TAMANHO_MAXIMO_DA_DESCRICAO,
} from "@/domain/chamados/chamado";

import {
  abrirChamado,
  resolverChamado,
  resolverChamadosEmLote,
} from "./acoes";
import type { Linha } from "./tipos";

export function DialogoAbrirChamado({
  espacos,
  onFechar,
}: {
  espacos: { id: string; nome: string }[];
  onFechar: () => void;
}) {
  return (
    <DialogoDeFormulario
      titulo="Abrir chamado"
      descricao="A equipe de TI recebe o chamado e atende pela ordem de prioridade."
      acao={abrirChamado}
      onFechar={onFechar}
      rotuloDoBotao="Abrir chamado"
      sucesso="Chamado aberto."
    >
      {(estado) => (
        <>
          <Campo
            id="chamadoEspaco"
            rotulo="Espaço"
            estado={estado}
            campo="espacoId"
          >
            <SelecaoComPesquisa
              id="chamadoEspaco"
              name="espacoId"
              opcoes={espacos}
              placeholder="Selecione o espaço"
              rotuloDaPesquisa="Pesquisar espaços"
            />
          </Campo>

          <Campo
            id="chamadoPrioridade"
            rotulo="Prioridade"
            estado={estado}
            campo="prioridade"
          >
            <Select name="prioridade" defaultValue="medium">
              <SelectTrigger id="chamadoPrioridade" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORIDADES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {ROTULO_DA_PRIORIDADE[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <Campo
            id="chamadoDescricao"
            rotulo="Problema"
            estado={estado}
            campo="descricao"
          >
            <Textarea
              id="chamadoDescricao"
              name="descricao"
              rows={4}
              maxLength={TAMANHO_MAXIMO_DA_DESCRICAO}
              placeholder="O projetor da sala não liga."
            />
          </Campo>
        </>
      )}
    </DialogoDeFormulario>
  );
}

export function DialogoResolverChamado({
  chamado,
  onFechar,
}: {
  chamado: Linha;
  onFechar: () => void;
}) {
  return (
    <DialogoDeFormulario
      titulo="Resolver chamado"
      descricao={`${chamado.espaco}: ${chamado.descricao}`}
      acao={resolverChamado}
      onFechar={onFechar}
      rotuloDoBotao="Resolver"
      sucesso="Chamado resolvido."
    >
      {(estado) => (
        <>
          <input type="hidden" name="id" value={chamado.id} />
          <Campo
            id="chamadoNota"
            rotulo="Solução"
            estado={estado}
            campo="nota"
            ajuda="O solicitante recebe a solução por e-mail."
          >
            <Textarea
              id="chamadoNota"
              name="nota"
              rows={4}
              maxLength={2000}
              placeholder="Cabo HDMI substituído."
            />
          </Campo>
        </>
      )}
    </DialogoDeFormulario>
  );
}

export function DialogoResolverEmLote({
  chamados,
  onFechar,
}: {
  chamados: Linha[];
  onFechar: () => void;
}) {
  return (
    <DialogoDeFormulario
      titulo={`Resolver ${chamados.length} ${chamados.length === 1 ? "chamado" : "chamados"}`}
      descricao={chamados.map((c) => `${c.espaco}: ${c.descricao}`).join("; ")}
      acao={resolverChamadosEmLote}
      onFechar={onFechar}
      rotuloDoBotao="Resolver"
    >
      {(estado) => (
        <>
          {chamados.map((c) => (
            <input key={c.id} type="hidden" name="ids" value={c.id} />
          ))}
          <Campo
            id="chamadosNota"
            rotulo="Solução"
            estado={estado}
            campo="nota"
            ajuda="A mesma solução é registrada em todos os chamados e cada solicitante recebe por e-mail."
          >
            <Textarea
              id="chamadosNota"
              name="nota"
              rows={4}
              maxLength={2000}
              placeholder="Cabo HDMI substituído."
            />
          </Campo>
        </>
      )}
    </DialogoDeFormulario>
  );
}
