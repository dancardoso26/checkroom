"use client";

import { useEffect, useRef, useState } from "react";

const DEGRADE = "linear-gradient(to bottom, black calc(100% - 4rem), transparent)";

export function RolagemComContinuidade({
  children,
}: {
  children: React.ReactNode;
}) {
  const area = useRef<HTMLDivElement>(null);
  const [temMais, setTemMais] = useState(false);

  useEffect(() => {
    const elemento = area.current;
    if (!elemento) return;

    const medir = () =>
      setTemMais(
        elemento.scrollTop + elemento.clientHeight < elemento.scrollHeight - 4,
      );

    medir();
    elemento.addEventListener("scroll", medir, { passive: true });
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    for (const filho of Array.from(elemento.children)) observador.observe(filho);

    return () => {
      elemento.removeEventListener("scroll", medir);
      observador.disconnect();
    };
  }, [children]);

  return (
    <div
      ref={area}
      data-tem-mais={temMais || undefined}
      className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2"
      style={
        temMais ? { maskImage: DEGRADE, WebkitMaskImage: DEGRADE } : undefined
      }
    >
      {children}
    </div>
  );
}
