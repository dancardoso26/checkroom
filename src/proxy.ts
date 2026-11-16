import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { aceiteEmDia } from "@/domain/documentos/documentos";
import type { Database } from "@/lib/supabase/database.types";
import { OPCOES_DO_COOKIE_DE_SESSAO } from "@/lib/supabase/opcoes-de-cookie";

const ROTAS_LIVRES = [
  "/termos",
  "/privacidade",
  "/nova-senha",
  "/auth/confirmar",
];

const ROTAS_DE_ENTRADA = ["/login", "/recuperar-senha"];

const ROTAS_DE_SEGUNDO_FATOR = ["/verificacao", "/verificacao/configurar"];

const ROTA_DE_ACEITE = "/aceitar-termos";

function casa(rotas: string[], caminho: string): boolean {
  return rotas.some(
    (rota) => caminho === rota || caminho.startsWith(`${rota}/`),
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: OPCOES_DO_COOKIE_DE_SESSAO,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;

  if (casa(ROTAS_LIVRES, caminho)) return response;

  if (!user) {
    if (casa(ROTAS_DE_ENTRADA, caminho)) return response;

    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.searchParams.set("proximo", caminho);
    return NextResponse.redirect(destino);
  }

  if (casa(ROTAS_DE_ENTRADA, caminho)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/reservas";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  if (casa(ROTAS_DE_SEGUNDO_FATOR, caminho)) return response;

  const { data: claims } = await supabase.auth.getClaims();

  if (claims?.claims?.aal !== "aal2") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/verificacao";
    return NextResponse.redirect(destino);
  }

  if (casa([ROTA_DE_ACEITE], caminho)) return response;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("terms_version")
    .eq("id", user.id)
    .maybeSingle();

  if (!aceiteEmDia(perfil?.terms_version ?? null)) {
    const destino = request.nextUrl.clone();
    destino.pathname = ROTA_DE_ACEITE;
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
