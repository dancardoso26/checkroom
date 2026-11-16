import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { generateSync } from "otplib";

import {
  CONTAS_COM_TOTP_FIXO,
  lerSegredos,
  salvarSegredos,
  type SegredoTotp,
} from "./helpers/segredos-totp";

const CONTA_COM_SEGUNDO_FATOR = "teste.mfa@exemplo.edu.br";

function lerEnv(): Record<string, string> {
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .map((linha) => linha.match(/^([A-Z_]+)=(.*)$/))
      .filter((par): par is RegExpMatchArray => par !== null)
      .map((par) => [par[1], par[2].trim()])
  );
}

export function clienteAdmin() {
  const env = lerEnv();

  return {
    senha: env.SEED_USER_PASSWORD,
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    chavePublica: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    supabase: createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SECRET_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    ),
  };
}

async function cadastrarTotpFixo(
  admin: SupabaseClient,
  conexao: { url: string; chavePublica: string; senha: string },
  usuarioId: string,
  email: string
): Promise<SegredoTotp> {
  const { data: fatores, error: falhaAoListar } =
    await admin.auth.admin.mfa.listFactors({ userId: usuarioId });
  if (falhaAoListar) throw falhaAoListar;

  for (const fator of fatores.factors) {
    const { error } = await admin.auth.admin.mfa.deleteFactor({
      userId: usuarioId,
      id: fator.id,
    });
    if (error) throw error;
  }

  const cliente = createClient(conexao.url, conexao.chavePublica, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: falhaNoLogin } = await cliente.auth.signInWithPassword({
    email,
    password: conexao.senha,
  });
  if (falhaNoLogin) throw falhaNoLogin;

  const { data: novo, error: falhaNoCadastro } = await cliente.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "CheckRoom",
  });
  if (falhaNoCadastro) throw falhaNoCadastro;

  const { error: falhaNaVerificacao } = await cliente.auth.mfa.challengeAndVerify({
    factorId: novo.id,
    code: generateSync({ secret: novo.totp.secret }),
  });
  if (falhaNaVerificacao) throw falhaNaVerificacao;

  await cliente.auth.signOut();

  return {
    fatorId: novo.id,
    segredo: novo.totp.secret,
    qrCode: novo.totp.qr_code,
  };
}

async function garantirTotpDasContasDeTeste(
  admin: SupabaseClient,
  conexao: { url: string; chavePublica: string; senha: string },
  usuarios: { id: string; email?: string }[]
) {
  const segredos = lerSegredos();

  for (const email of CONTAS_COM_TOTP_FIXO) {
    const usuario = usuarios.find((u) => u.email === email);
    if (!usuario) throw new Error(`A conta de teste ${email} não existe.`);

    const { data, error } = await admin.auth.admin.mfa.listFactors({
      userId: usuario.id,
    });
    if (error) throw error;

    const guardado = segredos[email];
    const emDia =
      guardado &&
      data.factors.length === 1 &&
      data.factors[0].id === guardado.fatorId &&
      data.factors[0].status === "verified";

    if (emDia) continue;

    segredos[email] = await cadastrarTotpFixo(admin, conexao, usuario.id, email);
    salvarSegredos(segredos);
  }
}

export default async function globalSetup() {
  const { supabase, senha, url, chavePublica } = clienteAdmin();

  const { data, error } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw error;

  await garantirTotpDasContasDeTeste(
    supabase,
    { url, chavePublica, senha },
    data.users
  );

  const existente = data.users.find((u) => u.email === CONTA_COM_SEGUNDO_FATOR);
  if (existente) await supabase.auth.admin.deleteUser(existente.id);

  const { error: falha } = await supabase.auth.admin.createUser({
    email: CONTA_COM_SEGUNDO_FATOR,
    password: senha,
    email_confirm: true,
    user_metadata: { full_name: "Teste de segundo fator" },
  });

  if (falha) throw falha;
}
