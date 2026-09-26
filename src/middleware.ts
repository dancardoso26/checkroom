import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { dispensaSegundoFator } from "@/lib/segundo-fator";

// Acessíveis com ou sem sessão. "/nova-senha" está aqui porque o link do
// e-mail cria sessão antes da troca, e expulsá-lo quebraria a recuperação.
const ROTAS_LIVRES = [
  "/termos",
  "/privacidade",
  "/nova-senha",
  "/auth/confirmar",
];

// Só fazem sentido para quem ainda não entrou.
const ROTAS_DE_ENTRADA = ["/login", "/recuperar-senha"];

// Telas do próprio fluxo de segundo fator: exigir aal2 nelas deixaria o usuário
// sem caminho para obter o aal2.
const ROTAS_DE_SEGUNDO_FATOR = ["/verificacao", "/verificacao/configurar"];

function casa(rotas: string[], caminho: string): boolean {
  return rotas.some(
    (rota) => caminho === rota || caminho.startsWith(`${rota}/`)
  );
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
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
    }
  );

  // getUser, e não getSession: só ele valida o token junto ao servidor de
  // autenticação, e o cookie é controlado por quem faz a requisição.
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

  // Quem é dispensado do segundo fator não tem o que fazer nas telas dele: um
  // link ou um botão voltar antigo o deixaria preso numa verificação sem sentido.
  if (dispensaSegundoFator(user.email)) {
    if (casa(ROTAS_DE_SEGUNDO_FATOR, caminho)) {
      const destino = request.nextUrl.clone();
      destino.pathname = "/reservas";
      destino.search = "";
      return NextResponse.redirect(destino);
    }

    return response;
  }

  if (casa(ROTAS_DE_SEGUNDO_FATOR, caminho)) return response;

  // Só a claim do token decide aqui: ela é o que o servidor de autenticação
  // afirma sobre esta sessão, e não depende de outra consulta dar certo.
  const { data: claims } = await supabase.auth.getClaims();

  if (claims?.claims?.aal !== "aal2") {
    const destino = request.nextUrl.clone();
    // Quem ainda não cadastrou o fator é mandado adiante pela própria tela de
    // verificação, que sabe distinguir os dois casos.
    destino.pathname = "/verificacao";
    return NextResponse.redirect(destino);
  }

  return response;
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos e imagens, que não têm o que proteger.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
