"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";

export function CampoDeSenha(
  props: Omit<React.ComponentProps<typeof Input>, "type">
) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visivel ? "text" : "password"}
        className="pr-10"
      />

      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visivel}
        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center"
      >
        {visivel ? (
          <EyeOff aria-hidden className="size-4" />
        ) : (
          <Eye aria-hidden className="size-4" />
        )}
      </button>
    </div>
  );
}
