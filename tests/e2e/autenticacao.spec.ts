import { test, expect } from "@playwright/test";
import { clienteAdmin } from "./global-setup";
import {
  ADMIN,
  CONTA_COM_SEGUNDO_FATOR,
  PROFESSOR,
  SENHA,
  entrarComo,
} from "./helpers/autenticacao";

test("exige login para chegar à agenda", async ({ page }) => {
  await page.goto("/reservas");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByLabel("E-mail institucional")).toBeVisible();
});

test("guarda o destino pedido antes do login", async ({ page }) => {
  await page.goto("/reservas/nova");

  await expect(page).toHaveURL(/proximo=%2Freservas%2Fnova/);
});

test("recusa senha incorreta sem dizer se o e-mail existe", async ({
  page,
}) => {
  await page.goto("/login");
  await page.fill("#email", PROFESSOR);
  await page.fill("#senha", "senha-errada");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("exige o segundo fator antes de liberar o sistema", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", CONTA_COM_SEGUNDO_FATOR);
  await page.fill("#senha", SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/verificacao/);
  await expect(page.getByRole("button", { name: "Verificar" })).toBeVisible();
});

test("da verificação é possível voltar ao login", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", CONTA_COM_SEGUNDO_FATOR);
  await page.fill("#senha", SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/verificacao/);

  await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "Voltar ao login" }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();

  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);
});

test("o professor reserva apenas em seu próprio nome", async ({ page }) => {
  await entrarComo(page, PROFESSOR);
  await page.goto("/reservas/nova");

  const campo = page.locator("#professorField");

  await expect(campo).toHaveText("Carlos Eduardo Lima");
  await expect(campo).not.toHaveAttribute("role", "combobox");
});

test("a administração reserva em nome de qualquer professor", async ({
  page,
}) => {
  await entrarComo(page, ADMIN);
  await page.goto("/reservas/nova");

  await page.click("#professorField");

  await expect(
    page.getByRole("option", { name: "Ana Beatriz Moura" })
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: "Marina Alves Prado" })
  ).toBeVisible();
});

test("o log de auditoria é exclusivo da administração", async ({ page }) => {
  await entrarComo(page, PROFESSOR);

  await expect(
    page.getByRole("menuitem", { name: "Log de auditoria" })
  ).toBeHidden();

  await page.goto("/configuracoes/auditoria");
  await expect(page).toHaveURL(/\/reservas/);
});

test("a administração alcança o log de auditoria", async ({ page }) => {
  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/auditoria");

  await expect(
    page.getByRole("heading", { name: "Log de auditoria" })
  ).toBeVisible();

  await expect(
    page.getByRole("cell", { name: "Entrou" }).first()
  ).toBeVisible();
});

test("o login entra no log de auditoria", async ({ page }) => {
  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/auditoria");

  const primeiraLinha = page.locator("tbody tr").first();

  await expect(primeiraLinha).toContainText("Administrador");
  await expect(primeiraLinha).toContainText(ADMIN);
  await expect(primeiraLinha).toContainText("Entrou no sistema");
});

test("sair encerra a sessão", async ({ page }) => {
  await entrarComo(page, ADMIN);

  await page.getByRole("button", { name: /Conta de Administrador/ }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();

  await expect(page).toHaveURL(/\/login/);

  await page.goto("/reservas");
  await expect(page).toHaveURL(/\/login/);
});

test("cadastra e verifica o segundo fator", async ({ page }) => {
  await entrarComo(page, CONTA_COM_SEGUNDO_FATOR);

  await expect(page).toHaveURL(/\/reservas/);
  await expect(page.getByText("sem segundo fator")).toBeHidden();
});

test("a conta de desenvolvimento entra sem segundo fator e avisa disso", async ({
  page,
}) => {
  await page.goto("/login");
  await page.fill("#email", ADMIN);
  await page.fill("#senha", SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/reservas/);
  await expect(
    page.getByText("Segundo fator dispensado neste ambiente")
  ).toBeVisible();
});

test("termos e privacidade são lidos sem login", async ({ page }) => {
  await page.goto("/termos");
  await expect(
    page.getByRole("heading", { name: "Termos de Uso" })
  ).toBeVisible();

  await page.goto("/privacidade");
  await expect(
    page.getByRole("heading", { name: "Política de Privacidade" })
  ).toBeVisible();
});

test("o olho mostra e oculta a senha digitada", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#senha", "segredo123");
  await expect(page.locator("#senha")).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(page.locator("#senha")).toHaveAttribute("type", "text");
  await expect(page.locator("#senha")).toHaveValue("segredo123");

  await page.getByRole("button", { name: "Ocultar senha" }).click();
  await expect(page.locator("#senha")).toHaveAttribute("type", "password");
});

test("a conta dispensada não cai na verificação por um destino antigo", async ({
  page,
}) => {
  await page.goto("/login?proximo=%2Fverificacao");
  await page.fill("#email", ADMIN);
  await page.fill("#senha", SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/reservas/);
});

test("a conta dispensada é levada à agenda se abrir a verificação", async ({
  page,
}) => {
  await entrarComo(page, ADMIN);

  await page.goto("/verificacao");

  await expect(page).toHaveURL(/\/reservas/);
});

test("o login não segue destino que aponta para outro site", async ({
  page,
}) => {
  await page.goto("/login?proximo=%2F%2Fsite-falso.com");
  await page.fill("#email", ADMIN);
  await page.fill("#senha", SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/localhost.*\/reservas/);
});

test("o menu do perfil abre os documentos em outra aba", async ({
  page,
  context,
}) => {
  await entrarComo(page, ADMIN);

  await page.getByRole("button", { name: /Conta de/ }).click();
  await page.getByRole("menuitem", { name: "Saiba mais" }).click();

  const [aba] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("menuitem", { name: "Política de Privacidade" }).click(),
  ]);

  await expect(aba).toHaveURL(/\/privacidade/);
  await expect(page).toHaveURL(/\/reservas/);
});

test("o log de auditoria cabe na tela, pagina e pesquisa", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/auditoria");

  const sobra = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(sobra).toBeLessThanOrEqual(0);

  await expect(page.getByRole("button", { name: "Anterior" })).toBeDisabled();
  await page.getByRole("button", { name: "Seguinte" }).click();
  await expect(page).toHaveURL(/pagina=2/);

  const campo = page.getByLabel("Número da página");
  await campo.fill("3");
  await campo.press("Enter");
  await expect(page).toHaveURL(/pagina=3/);

  await page.getByLabel("Itens por página").click();
  await page.getByRole("option", { name: "10", exact: true }).click();
  await expect(page).toHaveURL(/porPagina=10/);
  await expect(page).not.toHaveURL(/pagina=3/);
  await expect(page.locator("tbody tr")).toHaveCount(10);

  await page.getByLabel("Pesquisar no log de auditoria").fill("entrou");
  await expect(page).toHaveURL(/q=entrou/);
  await expect(page).not.toHaveURL(/pagina=/);
  await expect(page.locator("tbody tr").first()).toContainText("Entrou");
});

test("o link de recuperação quebrado explica o que fazer", async ({ page }) => {
  await page.goto("/auth/confirmar?proximo=/nova-senha");

  await expect(page).toHaveURL(/erro=link_invalido/);
  await expect(page.getByText(/incompleto. Peça um novo/)).toBeVisible();
});

test("o link de recuperação vencido também avisa", async ({ page }) => {
  await page.goto(
    "/auth/confirmar?token_hash=abc&type=recovery&proximo=/nova-senha"
  );

  await expect(page).toHaveURL(/erro=link_expirado/);
  await expect(page.getByText(/expirou ou já foi usado/)).toBeVisible();
});

test("a tela do convite pede para criar a senha", async ({ page }) => {
  await page.goto("/nova-senha?convite=1");

  await expect(page.getByText("Crie a senha da sua conta.")).toBeVisible();
  await expect(page.getByLabel("Confirme a senha")).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar senha" })).toBeVisible();
});

test("o Enter no campo de senha entra no sistema", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", ADMIN);
  await page.fill("#senha", SENHA);
  await page.locator("#senha").press("Enter");

  await expect(page).toHaveURL(/\/reservas/);
});

test("a sessão aberta só com a senha não troca a senha", async ({ page }) => {
  await entrarComo(page, ADMIN);
  await page.goto("/nova-senha");

  await page.fill("#senha", "Outra-senha-123");
  await page.fill("#confirmacao", "Outra-senha-123");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();

  await expect(page.getByText("use o link enviado por e-mail")).toBeVisible();
});

test("as respostas trazem os cabeçalhos de segurança", async ({ request }) => {
  const resposta = await request.get("/login");

  expect(resposta.headers()["x-frame-options"]).toBe("DENY");
  expect(resposta.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'"
  );
  expect(resposta.headers()["x-content-type-options"]).toBe("nosniff");
});

test("o login leva aos termos e à política sem precisar entrar", async ({
  page,
}) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: "Entre na sua conta" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Termos de Uso" })
  ).toHaveAttribute("href", "/termos");
  await expect(
    page.getByRole("link", { name: "Política de Privacidade" })
  ).toHaveAttribute("href", "/privacidade");
});

test("uma versão nova dos termos pede o aceite de novo", async ({ page }) => {
  await entrarComo(page, PROFESSOR);

  const { supabase } = clienteAdmin();
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const conta = data.users.find((u) => u.email === PROFESSOR)!;
  await supabase
    .from("profiles")
    .update({ terms_version: "0.9" })
    .eq("id", conta.id);

  await page.goto("/reservas");

  await expect(page).toHaveURL(/\/aceitar-termos/);
  await expect(page.getByText("Os documentos foram atualizados")).toBeVisible();

  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/reservas/);
});
