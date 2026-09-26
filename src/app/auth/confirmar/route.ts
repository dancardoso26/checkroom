import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { destinoAposLogin } from "@/lib/destino-apos-login";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// O link do e-mail chega aqui, não na tela final: o token é de uso único e
// precisa virar sessão antes que qualquer página tente usá-lo.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const token = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const codigo = searchParams.get("code");

  // Só destino interno: a criação de senha, da recuperação ou do convite.
  const pedido = searchParams.get("proximo");
  const destino =
    pedido === "/nova-senha" || pedido === "/nova-senha?convite=1"
      ? pedido
      : destinoAposLogin(pedido);

  const supabase = await createSupabaseServerClient();

  // Dois formatos de link. O token_hash vale em qualquer navegador; o code,
  // do modelo padrão do Supabase, só no mesmo navegador que pediu o e-mail,
  // porque depende de um cookie gravado no pedido.
  let erro: unknown = null;

  if (token && tipo) {
    ({ error: erro } = await supabase.auth.verifyOtp({
      type: tipo,
      token_hash: token,
    }));
  } else if (codigo) {
    ({ error: erro } = await supabase.auth.exchangeCodeForSession(codigo));
  } else {
    return NextResponse.redirect(`${origin}/login?erro=link_invalido`);
  }

  if (erro) {
    return NextResponse.redirect(`${origin}/login?erro=link_expirado`);
  }

  return NextResponse.redirect(`${origin}${destino}`);
}
