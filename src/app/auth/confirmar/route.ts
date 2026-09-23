import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// O link do e-mail chega aqui, não na tela final: o token é de uso único e
// precisa virar sessão antes que qualquer página tente usá-lo.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const token = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const destino = searchParams.get("proximo") ?? "/nova-senha";

  if (!token || !tipo) {
    return NextResponse.redirect(`${origin}/login?erro=link_invalido`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: token });

  if (error) {
    return NextResponse.redirect(`${origin}/login?erro=link_expirado`);
  }

  return NextResponse.redirect(`${origin}${destino}`);
}
