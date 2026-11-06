import { test, expect } from "@playwright/test";
import { ALUNO, PROFESSOR, TI, entrarComo } from "./helpers/autenticacao";
import { abrirDetalhe, semanaDoDia } from "./helpers/painel";

function proximaSegunda(): string {
  const hoje = new Date();
  const alvo = new Date(hoje);
  alvo.setDate(hoje.getDate() + ((8 - hoje.getDay()) % 7 || 7));

  const mes = String(alvo.getMonth() + 1).padStart(2, "0");
  const dia = String(alvo.getDate()).padStart(2, "0");

  return `${alvo.getFullYear()}-${mes}-${dia}`;
}

const SEGUNDA = proximaSegunda();

for (const [papel, conta] of [
  ["o aluno", ALUNO],
  ["a equipe de TI", TI],
] as const) {
  test(`${papel} vê a agenda, mas não abre uma reserva nova`, async ({ page }) => {
    await entrarComo(page, conta);
    await page.goto(semanaDoDia(`${SEGUNDA}T12:00:00-03:00`));

    await expect(
      page.locator("[data-reserva]").filter({ hasText: "Aula de Engenharia de Software" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Nova reserva" })).toHaveCount(0);

    await page.keyboard.press("n");
    await expect(page).not.toHaveURL(/nova=1/);

    await page.goto(`/reservas?nova=1&dia=${SEGUNDA}&data=${SEGUNDA}`);
    await expect(page.getByRole("dialog", { name: "Nova reserva" })).toHaveCount(0);

    await page.goto(semanaDoDia(`${SEGUNDA}T12:00:00-03:00`));
    const detalhe = await abrirDetalhe(page, "Aula de Engenharia de Software");
    await expect(detalhe.getByRole("button", { name: "Cancelar reserva" })).toHaveCount(0);
    await expect(detalhe.getByRole("button", { name: "Excluir" })).toHaveCount(0);
  });
}

test("o professor só tem ações nas reservas que são dele", async ({ page }) => {
  await entrarComo(page, PROFESSOR);
  await page.goto(`${semanaDoDia(`${SEGUNDA}T12:00:00-03:00`)}&minhas=0`);

  await expect(page.getByRole("button", { name: "Nova reserva" })).toBeVisible();

  const daAna = await abrirDetalhe(page, "Aula de Engenharia de Software");
  await expect(daAna.getByRole("button", { name: "Cancelar reserva" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  const dele = await abrirDetalhe(page, "Laboratório de Materiais");
  await expect(dele.getByRole("button", { name: "Cancelar reserva" })).toBeVisible();
});

test("a equipe de TI não acessa as palestras", async ({ page }) => {
  await entrarComo(page, TI);

  await expect(page.getByRole("link", { name: "Chamados" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Palestras" })).toHaveCount(0);

  await page.goto("/palestras");
  await expect(page).toHaveURL(/\/reservas/);
});
