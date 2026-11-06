import { test, expect } from "@playwright/test";
import { ADMIN, entrarComo } from "./helpers/autenticacao";

function proximaSegunda(): string {
  const hoje = new Date();
  const alvo = new Date(hoje);
  alvo.setDate(hoje.getDate() + ((8 - hoje.getDay()) % 7 || 7));

  const mes = String(alvo.getMonth() + 1).padStart(2, "0");
  const dia = String(alvo.getDate()).padStart(2, "0");

  return `${alvo.getFullYear()}-${mes}-${dia}`;
}

const SEGUNDA = proximaSegunda();
const SEMANA = `/reservas?visao=calendario&escala=semana&data=${SEGUNDA}`;

test.beforeEach(async ({ page }) => {
  await entrarComo(page, ADMIN);
});

test("a tela inicial é o calendário da semana", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/reservas/);
  await expect(page.getByRole("radio", { name: "Calendário" })).toHaveAttribute(
    "data-state",
    "on"
  );
  await expect(page.getByRole("combobox", { name: "Período" })).toHaveText(
    "Semana"
  );
});

test("o período se escolhe numa lista suspensa", async ({ page }) => {
  await page.goto(SEMANA);

  await page.getByRole("combobox", { name: "Período" }).click();
  await page.getByRole("option", { name: "Mês" }).click();

  await expect(page).toHaveURL(/escala=mes/);
  await expect(page.getByRole("combobox", { name: "Período" })).toHaveText(
    "Mês"
  );
});

test("o botão de criar fica na linha do título, e a pesquisa com os filtros abaixo", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(SEMANA);

  const centro = async (alvo: ReturnType<typeof page.getByRole>) => {
    const caixa = (await alvo.boundingBox())!;
    return caixa.y + caixa.height / 2;
  };

  const titulo = await centro(page.getByRole("heading", { level: 1 }));
  const hoje = await centro(page.getByRole("button", { name: "Hoje" }));
  const nova = await centro(page.getByRole("button", { name: "Nova reserva" }));
  const pesquisa = await centro(page.getByRole("searchbox", { name: "Pesquisar reservas" }));
  const filtros = await centro(page.getByRole("button", { name: "Filtros" }));

  expect(Math.abs(hoje - titulo)).toBeLessThan(8);
  expect(Math.abs(nova - titulo)).toBeLessThan(8);
  expect(Math.abs(filtros - pesquisa)).toBeLessThan(8);
  expect(pesquisa - titulo).toBeGreaterThan(20);
});

test("mostra a reserva do seed no dia e no horário dela", async ({ page }) => {
  await page.goto(SEMANA);

  await expect(
    page
      .locator(`[data-dia="${SEGUNDA}"] [data-reserva]`)
      .filter({ hasText: "Aula de Engenharia de Software" })
  ).toBeVisible();
});

test("as teclas D, S e M trocam a escala", async ({ page }) => {
  await page.goto(SEMANA);

  await expect(async () => {
    await page.keyboard.press("d");
    await expect(page).toHaveURL(/escala=dia/, { timeout: 1000 });
  }).toPass();

  await page.keyboard.press("m");
  await expect(page).toHaveURL(/escala=mes/);

  await page.keyboard.press("s");
  await expect(page).toHaveURL(/escala=semana/);
});

test("as setas navegam entre semanas", async ({ page }) => {
  await page.goto(SEMANA);
  const titulo = await page.getByRole("heading", { level: 1 }).innerText();

  await expect(async () => {
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(titulo, {
      timeout: 1000,
    });
  }).toPass();

  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(titulo);
});

test("os atalhos não disparam enquanto se digita", async ({ page }) => {
  await page.goto(`${SEMANA}&nova=1&dia=${SEGUNDA}`);

  await page.fill("#purposeField", "");
  await page.locator("#purposeField").pressSequentially("dsm");

  await expect(page.locator("#purposeField")).toHaveValue("dsm");
  await expect(page).toHaveURL(/escala=semana/);
});

test("clicar num horário vago abre o painel com uma hora", async ({ page }) => {
  await page.goto(SEMANA);
  await page.waitForLoadState("networkidle");

  await page.locator(`[data-dia="${SEGUNDA}"] [data-faixa="15:00"]`).click();

  await expect(
    page.getByRole("dialog", { name: "Nova reserva" })
  ).toBeVisible();
  await expect(page.locator("#dateField")).toHaveText(
    SEGUNDA.split("-").reverse().join("/")
  );
  await expect(page.locator("#startField")).toHaveText("15:00");
  await expect(page.locator("#endField")).toHaveText("16:00");

  const rascunho = page.locator(`[data-dia="${SEGUNDA}"] [data-rascunho]`);
  await expect(rascunho).toContainText("15:00 às 16:00");

  await page.fill("#purposeField", "Revisão para a prova");
  await expect(rascunho).toContainText("Revisão para a prova");
});

test("fechar o painel volta para a agenda", async ({ page }) => {
  await page.goto(`${SEMANA}&nova=1&dia=${SEGUNDA}`);
  await expect(
    page.getByRole("dialog", { name: "Nova reserva" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Cancelar" }).click();

  await expect(page.getByRole("dialog", { name: "Nova reserva" })).toBeHidden();
  await expect(page).not.toHaveURL(/nova=1/);
});

test("clicar numa reserva abre o detalhe com as ações", async ({ page }) => {
  await page.goto(SEMANA);
  await page.waitForLoadState("networkidle");

  await page
    .locator("[data-reserva]")
    .filter({ hasText: "Aula de Engenharia de Software" })
    .click();

  const detalhe = page.getByRole("dialog", {
    name: "Aula de Engenharia de Software",
  });

  await expect(detalhe).toBeVisible();
  await expect(detalhe.getByText("Ana Beatriz Moura")).toBeVisible();
  await expect(
    detalhe.getByRole("button", { name: "Cancelar reserva" })
  ).toBeVisible();
  await expect(detalhe.getByRole("button", { name: "Excluir" })).toBeVisible();
});

test("a tabela mostra reservas de qualquer período", async ({ page }) => {
  await page.goto(
    "/reservas?visao=tabela&escala=semana&data=2025-01-06&ordenar=data&sentido=asc"
  );

  await expect(
    page.getByRole("heading", { name: "Reservas", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "Aula de Engenharia de Software" })
  ).toBeVisible();
});

test("clicar no cabeçalho inverte a ordenação", async ({ page }) => {
  await page.goto("/reservas?visao=tabela");

  const data = page.getByRole("columnheader", { name: "Data" });
  await expect(data).toHaveAttribute("aria-sort", "descending");

  await data.getByRole("button").click();
  await expect(page).toHaveURL(/ordenar=data&sentido=asc/);
  await expect(data).toHaveAttribute("aria-sort", "ascending");

  const espaco = page.getByRole("columnheader", { name: "Espaço" });
  await espaco.getByRole("button").click();
  await expect(page).toHaveURL(/ordenar=espaco&sentido=asc/);
  await expect(espaco).toHaveAttribute("aria-sort", "ascending");
});

test("a barra lateral recolhe e expande", async ({ page }) => {
  await page.goto(SEMANA);

  const barra = page.locator('[data-slot="sidebar"][data-state]');
  const alternar = page.locator('[data-slot="sidebar-trigger"]:visible');

  await expect(barra).toHaveAttribute("data-state", "expanded");

  await alternar.click();
  await expect(barra).toHaveAttribute("data-state", "collapsed");

  await alternar.click();
  await expect(barra).toHaveAttribute("data-state", "expanded");
});

test("arrastar na grade abre o painel com início e término", async ({
  page,
}) => {
  await page.goto(SEMANA);

  const coluna = page.locator(`[data-dia="${SEGUNDA}"]`);

  await page.waitForLoadState("networkidle");
  await coluna.locator('[data-faixa="14:00"]').scrollIntoViewIfNeeded();

  const de = await coluna.locator('[data-faixa="14:00"]').boundingBox();
  const ate = await coluna.locator('[data-faixa="15:30"]').boundingBox();

  await page.mouse.move(de!.x + de!.width / 2, de!.y + 2);
  await page.mouse.down();
  await page.mouse.move(ate!.x + ate!.width / 2, ate!.y + ate!.height / 2, {
    steps: 5,
  });
  await page.mouse.move(ate!.x + ate!.width / 2, ate!.y + ate!.height - 2, {
    steps: 2,
  });
  await page.mouse.up();

  await expect(
    page.getByRole("dialog", { name: "Nova reserva" })
  ).toBeVisible();
  await expect(page.locator("#startField")).toHaveText("14:00");
  await expect(page.locator("#endField")).toHaveText("16:00");
});

test("o filtro de status mostra as canceladas", async ({ page }) => {
  await page.goto(SEMANA);

  await page.getByRole("button", { name: "Filtros" }).click();
  const painel = page.getByRole("dialog", { name: "Filtros" });

  await painel.getByRole("button", { name: "Status" }).click();
  await page.getByLabel("Canceladas").check();
  await page.keyboard.press("Escape");
  await painel.getByRole("button", { name: "Aplicar" }).click();

  await expect(page).toHaveURL(/status=agendadas%2Ccanceladas/);
  await expect(page.getByRole("button", { name: /Filtros\s*1/ })).toBeVisible();
});

test("o mês mostra a reserva e leva ao dia", async ({ page }) => {
  await page.goto(`/reservas?visao=calendario&escala=mes&data=${SEGUNDA}`);

  await expect(
    page
      .locator(`[data-dia="${SEGUNDA}"] [data-reserva]`)
      .filter({ hasText: "Aula de Engenharia de Software" })
  ).toBeVisible();

  await page.getByRole("button", { name: `Ver o dia ${SEGUNDA}` }).click();
  await expect(page).toHaveURL(new RegExp(`escala=dia&data=${SEGUNDA}`));
});

test("a rota antiga de nova reserva abre o painel", async ({ page }) => {
  await page.goto("/reservas/nova");

  await expect(
    page.getByRole("dialog", { name: "Nova reserva" })
  ).toBeVisible();
});

test("a tabela de reservas escolhe quantas linhas mostrar", async ({
  page,
}) => {
  await page.goto("/reservas?visao=tabela");

  await page.getByLabel("Itens por página").click();
  await page.getByRole("option", { name: "10", exact: true }).click();

  await expect(page).toHaveURL(/porPagina=10/);
  await expect(
    page.getByRole("columnheader", { name: "Data" })
  ).toHaveAttribute("aria-sort", "descending");
});
