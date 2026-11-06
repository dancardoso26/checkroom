"use client";

import { useState } from "react";

import { CampoDeData } from "@/components/campos-de-data-e-hora";
import { Campo } from "@/components/formulario";
import type { EstadoDoFormulario } from "@/lib/formulario";

export function DatasDoIntervalo({
  prefixo,
  estado,
  inicio,
  fim,
}: {
  prefixo: string;
  estado: EstadoDoFormulario;
  inicio?: string;
  fim?: string;
}) {
  const [primeiroDia, setPrimeiroDia] = useState(inicio ?? "");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo
        id={`${prefixo}Inicio`}
        rotulo="Início"
        estado={estado}
        campo="inicio"
      >
        <CampoDeData
          id={`${prefixo}Inicio`}
          name="inicio"
          defaultValue={inicio}
          onChange={setPrimeiroDia}
        />
      </Campo>
      <Campo id={`${prefixo}Fim`} rotulo="Término" estado={estado} campo="fim">
        <CampoDeData
          id={`${prefixo}Fim`}
          name="fim"
          defaultValue={fim}
          minimo={primeiroDia || undefined}
        />
      </Campo>
    </div>
  );
}
