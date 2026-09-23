import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ROTAS_PUBLICAS = [
  "/login",
  "/recuperar-senha",
  "/nova-senha",
  "/termos",
  "/privacidade",
];

// Telas do próprio fluxo de segundo fator: exigir aal2 nelas deixaria o usuário
// sem caminho para obter o aal2.
const ROTAS_DE_SEGUNDO_FATOR = ["/verificacao", "/verificacao/configurar"];

function ehPublica(caminho: string): boolean {
  return ROTAS_PUBLICAS.some(
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

  if (!user) {
    if (ehPublica(caminho)) return response;

    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.searchParams.set("proximo", caminho);
    return NextResponse.redirect(destino);
  }

  if (ehPublica(caminho)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/reservas";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  const { data: nivel } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  // nextLevel maior que currentLevel significa que a conta tem segundo fator
  // cadastrado e a sessão ainda não passou por ele.
  const precisaVerificar = nivel?.nextLevel !== nivel?.currentLevel;
  const precisaCadastrar = nivel?.nextLevel === "aal1";

  if (ROTAS_DE_SEGUNDO_FATOR.includes(caminho)) return response;

  if (precisaCadastrar) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/verificacao/configurar";
    return NextResponse.redirect(destino);
  }

  if (precisaVerificar) {
    const destino = request.nextUrl.clone();
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
