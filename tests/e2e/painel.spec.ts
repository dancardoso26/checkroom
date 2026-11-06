import { test, expect } from "@playwright/test";
import { ADMIN, PROFESSOR, entrarComo } from "./helpers/autenticacao";
import { contar } from "./helpers/banco";

function mesCorrente() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const ultimo = new Date(ano, hoje.getMonth() + 1, 0).getDate();
  const proximo = new Date(ano, hoje.getMonth() + 1, 1);

  return {
    de: `${ano}-${mes}-01`,
    ate: `${ano}-${mes}-${ultimo}`,
    inicio: `${ano}-${mes}-01T00:00:00-03:00`,
    fim: `${proximo.getFullYear()}-${String(proximo.getMonth() + 1).padStart(2, "0")}-01T00:00:00-03:00`,
  };
}

test("os indicadores de cada aba coincidem com a contagem no banco", async ({ page }) => {
  const mes = mesCorrente();
  const periodo = (coluna: string) =>
    `${coluna}=gte.${encodeURIComponent(mes.inicio)}&${coluna}=lt.${encodeURIComponent(mes.fim)}`;

  const [reservas, chamados, palestras] = await Promise.all([
    contar(`bookings?status=eq.active&${periodo("starts_at")}`),
    contar(`tickets?${periodo("created_at")}`),
    contar(`lectures?${periodo("starts_at")}`),
  ]);

  await entrarComo(page, ADMIN);
  const filtro = `de=${mes.de}&ate=${mes.ate}`;

  await page.goto(`/dashboard?${filtro}`);
  await expect(page.getByRole("tab", { name: "Reservas" })).toHaveAttribute(
    "data-state",
    "active"
  );
  await expect(page.locator('[data-indicador="Reservas no período"]')).toHaveText(
    String(reservas)
  );
  await expect(page.getByText("Ocupação por espaço")).toBeVisible();
  await expect(page.getByText("Horários mais ocupados")).toBeVisible();

  await page.goto(`/dashboard?aba=palestras&${filtro}`);
  await expect(page.locator('[data-indicador="Palestras no período"]')).toHaveText(
    String(palestras)
  );
  await expect(page.getByText("Inscritos por palestra")).toBeVisible();

  await page.goto(`/dashboard?aba=chamados&${filtro}`);
  await expect(
    page.locator('[data-indicador="Chamados abertos no período"]')
  ).toHaveText(String(chamados));
  await expect(page.getByText("Chamados por situação e prioridade")).toBeVisible();
  await expect(page.getByText("Chamados não resolvidos")).toBeVisible();
});

test("trocar de aba mantém o período escolhido", async ({ page }) => {
  const mes = mesCorrente();

  await entrarComo(page, ADMIN);
  await page.goto(`/dashboard?de=${mes.de}&ate=${mes.ate}`);

  await page.getByRole("tab", { name: "Chamados" }).click();
  await expect(page).toHaveURL(
    new RegExp(`aba=chamados&de=${mes.de}&ate=${mes.ate}`)
  );
  await expect(page.getByText("Chamados não resolvidos")).toBeVisible();

  await page.getByRole("tab", { name: "Palestras" }).click();
  await expect(page).toHaveURL(
    new RegExp(`aba=palestras&de=${mes.de}&ate=${mes.ate}`)
  );
});

test("cada chamado não resolvido leva à tela de chamados, já destacado", async ({ page }) => {
  await entrarComo(page, ADMIN);
  await page.goto("/dashboard?aba=chamados");

  await page.getByRole("link", { name: "Ver chamado" }).first().click();

  await expect(page).toHaveURL(/\/chamados\?chamado=/);
  await expect(page.locator("article.ring-2")).toHaveCount(1);
});

test("quem não administra não vê o dashboard", async ({ page }) => {
  await entrarComo(page, PROFESSOR);
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/reservas/);
});
