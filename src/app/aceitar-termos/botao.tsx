"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import { aceitarTermos, type AceiteState } from "./acoes";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const ESTADO_INICIAL: AceiteState = { status: "idle" };

export function BotaoDeAceite() {
  const formulario = useRef<HTMLFormElement>(null);
  const [marcado, setMarcado] = useState(false);
  const [state, formAction, enviando] = useActionState(
    aceitarTermos,
    ESTADO_INICIAL
  );

  useEffect(() => {
    if (state.status !== "success") return;

    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/reservas");
  }, [state.status]);

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => formAction(dados));
  }

  return (
    <form ref={formulario} onSubmit={enviar} className="space-y-4">
      <div className="flex items-start gap-2.5">
        <Checkbox
          id="aceite"
          name="aceite"
          checked={marcado}
          onCheckedChange={(valor) => setMarcado(valor === true)}
          className="mt-0.5"
        />
        <Label htmlFor="aceite" className="text-sm leading-snug font-normal">
          Li e aceito os termos de uso, e estou ciente da política de
          privacidade.
        </Label>
      </div>

      {state.status === "error" && (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      )}

      <Button
        type="button"
        className="w-full"
        disabled={!marcado || enviando}
        onClick={() => formulario.current?.requestSubmit()}
      >
        {enviando ? "Registrando..." : "Continuar"}
      </Button>
    </form>
  );
}
