import { Skeleton } from "@/components/ui/skeleton";

function Carregando({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">Carregando</span>
      {children}
    </div>
  );
}

function Cabecalho({ comAcao = true }: { comAcao?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Skeleton className="h-7 w-44" />
      {comAcao && <Skeleton className="h-9 w-36" />}
    </div>
  );
}

function Tabela({ linhas = 8, colunas = 5 }: { linhas?: number; colunas?: number }) {
  return (
    <div className="bg-card rounded-lg border">
      <div className="flex gap-8 border-b px-5 py-3.5">
        {Array.from({ length: colunas }, (_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: linhas }, (_, linha) => (
        <div key={linha} className="flex gap-8 border-b px-5 py-4 last:border-b-0">
          {Array.from({ length: colunas }, (_, coluna) => (
            <Skeleton
              key={coluna}
              className={coluna === colunas - 1 ? "h-4 flex-[2]" : "h-4 flex-1"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EsqueletoDeTabela() {
  return (
    <Carregando>
      <Cabecalho />
      <Tabela />
    </Carregando>
  );
}

export function EsqueletoDeCartoes() {
  return (
    <Carregando>
      <Cabecalho />
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-card space-y-3 rounded-xl border p-6">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/5" />
            </div>
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </Carregando>
  );
}

export function EsqueletoDoDashboard() {
  return (
    <Carregando>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-9 w-72" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-card space-y-2 rounded-xl border px-4 py-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-1/3" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="bg-card space-y-3 rounded-xl border p-6">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        ))}
      </div>
    </Carregando>
  );
}

export function EsqueletoDaAgenda() {
  return (
    <Carregando>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
          <Skeleton className="h-7 w-56" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <div className="bg-card overflow-hidden rounded-lg border">
        <div className="grid grid-cols-[4rem_repeat(7,1fr)] border-b">
          <div />
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 border-l py-3">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="size-8 rounded-full" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[4rem_repeat(7,1fr)]">
          {Array.from({ length: 8 }, (_, hora) => (
            <div key={hora} className="contents">
              <div className="flex h-16 justify-end pt-1 pr-2">
                <Skeleton className="h-3 w-9" />
              </div>
              {Array.from({ length: 7 }, (_, dia) => (
                <div key={dia} className="h-16 border-t border-l" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Carregando>
  );
}

export function EsqueletoDeConta() {
  return (
    <Carregando>
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-7 w-40" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-card space-y-3 rounded-xl border p-6">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </Carregando>
  );
}
