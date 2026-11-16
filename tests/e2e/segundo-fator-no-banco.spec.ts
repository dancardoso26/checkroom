import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { generateSync } from "otplib";

import { clienteAdmin } from "./global-setup";
import { ALUNO, PROFESSOR, SENHA } from "./helpers/autenticacao";
import { lerSegredos } from "./helpers/segredos-totp";

async function entrarSoComSenha(email: string) {
  const { url, chavePublica } = clienteAdmin();
  const cliente = createClient(url, chavePublica, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await cliente.auth.signInWithPassword({
    email,
    password: SENHA,
  });
  if (error) throw error;

  return cliente;
}

test("com só a senha, o banco recusa a leitura de tabelas", async () => {
  const cliente = await entrarSoComSenha(PROFESSOR);

  const { data, error, status } = await cliente.from("rooms").select("id");

  expect(data).toBeNull();
  expect(status).toBe(403);
  expect(error?.code).toBe("aal2_required");
});

test("com só a senha, o banco recusa as funções que gravam dados", async () => {
  const cliente = await entrarSoComSenha(ALUNO);

  const { error, status } = await cliente.rpc("inscrever_em_palestra", {
    p_palestra: "00000000-0000-0000-0000-000000000000",
  });

  expect(status).toBe(403);
  expect(error?.code).toBe("aal2_required");
});

test("depois do código do autenticador, o banco libera o acesso", async () => {
  const cliente = await entrarSoComSenha(PROFESSOR);
  const { fatorId, segredo } = lerSegredos()[PROFESSOR];

  const { error: falha } = await cliente.auth.mfa.challengeAndVerify({
    factorId: fatorId,
    code: generateSync({ secret: segredo }),
  });
  expect(falha).toBeNull();

  const { data, error } = await cliente.from("rooms").select("id").limit(1);

  expect(error).toBeNull();
  expect(data?.length).toBe(1);
});
