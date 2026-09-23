import { test, expect } from "@playwright/test";
import { ADMIN, PROFESSOR, SENHA, entrarComo } from "./helpers/autenticacao";

test("exige login para chegar à agenda", async ({ page }) => {
  await page.goto("/reservas");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByLabel("E-mail institucional")).toBeVisible();
});

// A rota pedida volta na query para que o login devolva a pessoa onde ela
// estava, em vez de despejá-la sempre na agenda.
test("guarda o destino pedido antes do login", async ({ page }) => {
  await page.goto("/reservas/nova");

  await expect(page).toHaveURL(/proximo=%2Freservas%2Fnova/);
});

test("recusa senha incorreta sem dizer se o e-mail existe", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", PROFESSOR);
  await page.fill("#senha", "senha-errada");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("exige o segundo fator antes de liberar o sistema", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", ADMIN);
  await page.fill("#senha", SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();

  // A senha correta leva à verificação, não à agenda.
  await expect(page).toHaveURL(/\/verificacao/);
  await expect(page.getByRole("button", { name: "Verificar" })).toBeVisible();
});

test("o professor reserva apenas em seu próprio nome", async ({ page }) => {
  await entrarComo(page, PROFESSOR);
  await page.goto("/reservas/nova");

  const campo = page.locator("#professorField");

  await expect(campo).toHaveText("Carlos Eduardo Lima");
  // Sem combobox: o nome é fixo, não uma escolha.
  await expect(campo).not.toHaveAttribute("role", "combobox");
});

test("a administração reserva em nome de qualquer docente", async ({ page }) => {
  await entrarComo(page, ADMIN);
  await page.goto("/reservas/nova");

  await page.click("#professorField");

  await expect(page.getByRole("option", { name: "Ana Beatriz Moura" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Marina Alves Prado" })).toBeVisible();
});

test("a trilha de auditoria é exclusiva da administração", async ({ page }) => {
  await entrarComo(page, PROFESSOR);

  await expect(page.getByRole("menuitem", { name: "Trilha de auditoria" })).toBeHidden();

  // Esconder o item do menu não é o controle: a rota recusa por conta própria.
  await page.goto("/auditoria");
  await expect(page).toHaveURL(/\/reservas/);
});

test("a administração alcança a trilha de auditoria", async ({ page }) => {
  await entrarComo(page, ADMIN);
  await page.goto("/auditoria");

  await expect(
    page.getByRole("heading", { name: "Trilha de auditoria" })
  ).toBeVisible();

  await expect(page.getByRole("cell", { name: "Entrou" }).first()).toBeVisible();
});

test("o login entra na trilha de auditoria", async ({ page }) => {
  await entrarComo(page, ADMIN);
  await page.goto("/auditoria");

  const primeiraLinha = page.locator("tbody tr").first();

  await expect(primeiraLinha).toContainText("Coordenação Acadêmica");
  await expect(primeiraLinha).toContainText("Autenticação");
});

test("sair encerra a sessão", async ({ page }) => {
  await entrarComo(page, ADMIN);

  await page.getByRole("button", { name: /Coordenação/ }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();

  await expect(page).toHaveURL(/\/login/);

  await page.goto("/reservas");
  await expect(page).toHaveURL(/\/login/);
});

test("termos e privacidade são lidos sem login", async ({ page }) => {
  await page.goto("/termos");
  await expect(page.getByRole("heading", { name: "Termos de Uso" })).toBeVisible();

  await page.goto("/privacidade");
  await expect(
    page.getByRole("heading", { name: "Política de Privacidade" })
  ).toBeVisible();
});
