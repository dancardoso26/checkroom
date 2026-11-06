"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RotuloDeCampo } from "@/components/rotulo-de-campo";
import { Label } from "@/components/ui/label";
import {
  ESTADO_INICIAL,
  type EstadoDoFormulario,
  type ResultadoDaAcao,
} from "@/lib/formulario";

export function errosDoCampo(
  estado: EstadoDoFormulario,
  campo: string
): string[] {
  return estado.status === "error" ? (estado.erros[campo] ?? []) : [];
}

export function Campo({
  id,
  rotulo,
  estado,
  campo,
  ajuda,
  children,
}: {
  id: string;
  rotulo: string;
  estado: EstadoDoFormulario;
  campo: string;
  ajuda?: string;
  children: React.ReactNode;
}) {
  const erros = errosDoCampo(estado, campo);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        <RotuloDeCampo rotulo={rotulo} />
      </Label>
      {children}
      {ajuda && erros.length === 0 && (
        <p className="text-muted-foreground text-xs">{ajuda}</p>
      )}
      {erros.map((erro) => (
        <p key={erro} className="text-destructive text-sm" role="alert">
          {erro}
        </p>
      ))}
    </div>
  );
}

export function DialogoDeFormulario({
  titulo,
  descricao,
  acao,
  onFechar,
  rotuloDoBotao = "Salvar",
  sucesso = "Salvo com sucesso.",
  children,
}: {
  titulo: string;
  descricao?: string;
  acao: (
    estado: EstadoDoFormulario,
    dados: FormData
  ) => Promise<EstadoDoFormulario>;
  onFechar: () => void;
  rotuloDoBotao?: string;
  sucesso?: string;
  children: (estado: EstadoDoFormulario) => React.ReactNode;
}) {
  const [estado, setEstado] = useState(ESTADO_INICIAL);
  const [enviando, startTransition] = useTransition();

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);

    startTransition(async () => {
      const resultado = await acao(estado, dados);
      setEstado(resultado);
      if (resultado.status === "success") {
        toast.success(sucesso);
        onFechar();
      }
    });
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descricao && <DialogDescription>{descricao}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4" noValidate>
          {children(estado)}

          {estado.status === "error" && estado.mensagem && (
            <p className="text-destructive text-sm" role="alert">
              {estado.mensagem}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Salvando..." : rotuloDoBotao}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmarExclusao({
  titulo,
  descricao,
  aviso,
  acao,
  onFechar,
  rotuloDoBotao = "Excluir",
  sucesso = rotuloDoBotao === "Excluir"
    ? "Excluído com sucesso."
    : "Ação concluída.",
}: {
  titulo: string;
  descricao: string;
  aviso?: string;
  acao: () => Promise<ResultadoDaAcao>;
  onFechar: () => void;
  rotuloDoBotao?: string;
  sucesso?: string;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, startTransition] = useTransition();

  function confirmar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await acao();
      if (resultado.ok) {
        toast.success(sucesso);
        onFechar();
      } else setErro(resultado.mensagem);
    });
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        {aviso && <p className="text-muted-foreground text-sm">{aviso}</p>}

        {erro && (
          <p className="text-destructive text-sm" role="alert">
            {erro}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onFechar}>
            Voltar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={excluindo}
            onClick={confirmar}
          >
            {excluindo ? "Excluindo..." : rotuloDoBotao}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
