import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { destinoAposLogin } from "@/domain/auth/destino-apos-login";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const token = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const codigo = searchParams.get("code");

  const pedido = searchParams.get("proximo");
  const destino =
    pedido === "/nova-senha" || pedido === "/nova-senha?convite=1"
      ? pedido
      : destinoAposLogin(pedido);

  const supabase = await createSupabaseServerClient();

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
