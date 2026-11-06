"use client";

import { Tag } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ICONE_DO_CAMPO } from "@/lib/campos-padrao";

export function LinhaDoFormulario({
  rotulo,
  htmlFor,
  children,
}: {
  rotulo: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  const Icone = ICONE_DO_CAMPO[rotulo] ?? Tag;

  return (
    <div className="flex items-start gap-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="mt-2 shrink-0">
            <Icone
              aria-hidden
              className="text-muted-foreground size-5"
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side="left">{rotulo}</TooltipContent>
      </Tooltip>
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor={htmlFor} className="sr-only">
          {rotulo}
        </Label>
        {children}
      </div>
    </div>
  );
}
