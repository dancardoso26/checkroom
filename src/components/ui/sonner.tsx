"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      closeButton
      richColors
      duration={5000}
      style={
        {
          "--normal-bg": "hsl(var(--card))",
          "--normal-text": "hsl(var(--foreground))",
          "--normal-border": "hsl(var(--border))",
          "--success-bg": "hsl(var(--success-subtle))",
          "--success-text": "hsl(var(--success))",
          "--success-border": "hsl(var(--success) / 0.3)",
          "--error-bg": "hsl(var(--destructive-subtle))",
          "--error-text": "hsl(var(--destructive))",
          "--error-border": "hsl(var(--destructive) / 0.3)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
