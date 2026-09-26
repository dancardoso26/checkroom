import { test, expect } from "@playwright/test";
import { ADMIN, PROFESSOR, SENHA, entrarComo } from "./helpers/autenticacao";
import { clienteAdmin } from "./global-setup";

// Só leitura: desativar ou excluir aqui atingiria as contas que a própria
// suíte usa para entrar.
test("a administração vê os usuários e não pode alterar a própria conta", async ({
  page,
}) => {
  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/usuarios");

  await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();

  const professor = page.locator(`[data-usuario="${PROFESSOR}"]`);
  await expect(professor.getByText("Ativo")).toBeVisible();
  await expect(
    professor.getByRole("button", { name: `Ações do usuário ${PROFESSOR}` })
  ).toBeVisible();

  const admin = page.locator(`[data-usuario="${ADMIN}"]`);
  await expect(admin).toBeVisible();
  await expect(admin.getByRole("button")).toHaveCount(0);
});

test("o menu do perfil leva aos usuários", async ({ page }) => {
  await entrarComo(page, ADMIN);

  await page.getByRole("button", { name: /Conta de/ }).click();
  await page.getByRole("menuitem", { name: "Configurações" }).click();

  // A raiz das configurações leva à primeira opção, e a barra lateral troca de
  // conteúdo: o Voltar devolve à tela de onde se entrou.
  await expect(page).toHaveURL(/\/configuracoes\/usuarios/);
  await expect(page.getByRole("link", { name: "Reservas" })).toBeHidden();

  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page).toHaveURL(/\/reservas/);
  await expect(page.getByRole("link", { name: "Reservas" })).toBeVisible();
});

test("quem não administra não abre a gestão de usuários", async ({ page }) => {
  await entrarComo(page, PROFESSOR);
  await page.goto("/configuracoes/usuarios");

  await expect(page).toHaveURL(/\/reservas/);
});

// Abre e fecha sem salvar: trocar o papel de verdade mexeria nas contas que a
// própria suíte usa. A regra do banco é coberta pela migration e pelo domínio.
test("editar oferece todos os papéis, inclusive administrador", async ({
  page,
}) => {
  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/usuarios");

  await page
    .getByRole("button", { name: `Ações do usuário ${PROFESSOR}` })
    .click();
  await page.getByRole("menuitem", { name: "Editar" }).click();

  const modal = page.getByRole("dialog", { name: "Editar usuário" });
  await modal.getByLabel("Perfil").click();

  await expect(page.getByRole("option", { name: "Professor" })).toBeVisible();
  await expect(
    page.getByRole("option", { name: "Administrador" })
  ).toBeVisible();

  await page.getByRole("option", { name: "Aluno" }).click();
  await expect(modal.getByText("O vínculo docente é desfeito")).toBeVisible();

  await modal.getByRole("button", { name: "Voltar" }).click();
  await expect(modal).toBeHidden();
});

// Não envia convite de verdade: um e-mail já cadastrado é recusado antes do
// envio, o que testa o formulário e a ação sem mandar nada para ninguém.
test("convidar recusa e-mail já cadastrado", async ({ page }) => {
  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/usuarios");

  await page.getByRole("button", { name: "Convidar usuário" }).click();
  const modal = page.getByRole("dialog", { name: "Convidar usuário" });

  await modal.getByLabel("Perfil").click();
  await expect(
    page.getByRole("option", { name: "Administrador" })
  ).toBeVisible();
  await page.getByRole("option", { name: "Aluno" }).click();

  // O vínculo docente só existe para professor.
  await expect(modal.getByLabel("Docente vinculado")).toHaveCount(0);

  await modal.getByLabel("Nome completo").fill("Pessoa Repetida");
  await modal.getByLabel("E-mail").fill(PROFESSOR);
  await modal.getByRole("button", { name: "Enviar convite" }).click();

  await expect(
    modal.getByText("Já existe uma conta com este e-mail.")
  ).toBeVisible();
});

test("o master tem selo e nenhuma ação; outro admin pode ser gerenciado", async ({
  page,
}) => {
  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/usuarios");

  // O dev.admin é o master e também a própria conta: sem menu de ações.
  const master = page.locator(`[data-usuario="${ADMIN}"]`);
  await expect(master.getByText("Master")).toBeVisible();
  await expect(master.getByRole("button")).toHaveCount(0);

  const coordenacao = page.locator(
    '[data-usuario="coordenacao@exemplo.edu.br"]'
  );
  await expect(coordenacao.getByText("Administrador")).toBeVisible();
  await expect(
    coordenacao.getByRole("button", { name: /Ações do usuário/ })
  ).toBeVisible();
});

// Esquecer, pela LGPD: depois de removida, a pessoa não é mais encontrável
// nem pelo perfil, nem pelo cadastro de docente, nem pela trilha de auditoria.
test("excluir um usuário apaga o que o identificava", async ({ page }) => {
  const { supabase } = clienteAdmin();
  const marca = Date.now();
  const email = `esquecer-${marca}@checkroom.com.br`;

  const { data: docente, error: falhaDocente } = await supabase
    .from("professors")
    .insert({ name: `Docente ${marca}`, email })
    .select("id")
    .single();
  if (falhaDocente) throw falhaDocente;

  const { data: conta, error: falhaConta } =
    await supabase.auth.admin.createUser({
      email,
      password: SENHA,
      email_confirm: true,
      user_metadata: { full_name: `Pessoa ${marca}` },
    });
  if (falhaConta) throw falhaConta;

  // Como no convite: a conta nasce aluno, e o papel vem do servidor.
  await supabase
    .from("profiles")
    .update({ role: "professor", professor_id: docente.id })
    .eq("id", conta.user.id);

  // Uma tentativa de login recusada grava o e-mail digitado na auditoria.
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#senha", "senha-errada");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();

  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/usuarios");
  await page.getByRole("button", { name: `Ações do usuário ${email}` }).click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir" })
    .click();
  await expect(page.locator(`[data-usuario="${email}"]`)).toHaveCount(0);

  const [perfil, cadastro, auditoria] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, anonymized_at")
      .eq("id", conta.user.id)
      .single(),
    supabase
      .from("professors")
      .select("name, email")
      .eq("id", docente.id)
      .single(),
    supabase
      .from("audit_logs")
      .select("id")
      .or(`after_state->>email.eq.${email},before_state->>email.eq.${email}`),
  ]);

  expect(perfil.data?.full_name).toBe("Usuário removido");
  expect(perfil.data?.anonymized_at).not.toBeNull();
  expect(cadastro.data?.name).toBe("Docente removido");
  expect(cadastro.data?.email).toMatch(/@checkroom\.invalid$/);
  expect(auditoria.data).toHaveLength(0);
});

// Só abre o menu, sem clicar: reenviar mandaria um e-mail de verdade.
test("reenviar convite aparece só para convite pendente", async ({ page }) => {
  const { supabase } = clienteAdmin();
  const email = `pendente-${Date.now()}@checkroom.com.br`;

  // Conta sem e-mail confirmado é exatamente um convite que não foi aceito.
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { full_name: "Convite de teste" },
  });
  if (error) throw error;

  try {
    await entrarComo(page, ADMIN);
    await page.goto("/configuracoes/usuarios");

    const linha = page.locator(`[data-usuario="${email}"]`);
    await expect(linha.getByText("Convite pendente")).toBeVisible();

    await page
      .getByRole("button", { name: `Ações do usuário ${email}` })
      .click();
    await expect(
      page.getByRole("menuitem", { name: "Reenviar convite" })
    ).toBeVisible();
    await page.keyboard.press("Escape");

    // Quem já criou a senha não tem convite a reenviar.
    await page
      .getByRole("button", { name: `Ações do usuário ${PROFESSOR}` })
      .click();
    await expect(
      page.getByRole("menuitem", { name: "Reenviar convite" })
    ).toHaveCount(0);
  } finally {
    // Sem reservas nem auditoria ligadas a ela, a conta pode ser apagada de vez.
    await supabase.auth.admin.deleteUser(data.user.id);
  }
});
