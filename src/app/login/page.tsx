import Link from "next/link";

import { Logo } from "@/components/logo";
import { FormularioDeLogin } from "./formulario";

export const metadata = { title: "Entrar | CheckRoom" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string }>;
}) {
  const { proximo } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo altura={32} />
          <p className="text-muted-foreground text-sm">
            Entre para reservar espaços e acompanhar a agenda acadêmica.
          </p>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <FormularioDeLogin proximo={proximo} />
        </div>

        <p className="text-muted-foreground text-center text-xs">
          Ao entrar você concorda com os{" "}
          <Link href="/termos" className="hover:text-foreground underline">
            termos de uso
          </Link>{" "}
          e com a{" "}
          <Link href="/privacidade" className="hover:text-foreground underline">
            política de privacidade
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
