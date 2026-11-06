"use client";

import { useState } from "react";

import { SeletorDeData } from "@/components/seletor-de-data";
import { SeletorDeHora } from "@/components/seletor-de-hora";
import { localDayKey } from "@/lib/datetime";

export function CampoDeData({
  id,
  name,
  defaultValue = "",
  minimo,
  hoje,
  onChange,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  minimo?: string;
  hoje?: string;
  onChange?: (valor: string) => void;
}) {
  const [valor, setValor] = useState(defaultValue);
  const [diaDeHoje] = useState(() => hoje ?? localDayKey(new Date()));

  return (
    <>
      <SeletorDeData
        id={id}
        value={valor}
        onChange={(novo) => {
          setValor(novo);
          onChange?.(novo);
        }}
        minimo={minimo}
        hoje={diaDeHoje}
      />
      <input type="hidden" name={name} value={valor} />
    </>
  );
}

export function CampoDeHora({
  id,
  name,
  defaultValue = "",
  minimo,
  maximo,
  onChange,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  minimo?: string;
  maximo?: string;
  onChange?: (valor: string) => void;
}) {
  const [valor, setValor] = useState(defaultValue);

  return (
    <>
      <SeletorDeHora
        id={id}
        value={valor}
        onChange={(novo) => {
          setValor(novo);
          onChange?.(novo);
        }}
        minimo={minimo}
        maximo={maximo}
      />
      <input type="hidden" name={name} value={valor} />
    </>
  );
}
