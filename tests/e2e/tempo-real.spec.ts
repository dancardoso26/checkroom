import { test, expect } from "@playwright/test";
import { ADMIN, ALUNO, entrarComo } from "./helpers/autenticacao";
import {
  apagarReserva,
  criarAulaDeReferencia,
  limparReservasDeTeste,
} from "./helpers/banco";
import { blocoDaReserva, semanaDoDia } from "./helpers/painel";

function proximaSegunda(): string {
  const hoje = new Date();
  const alvo = new Date(hoje);
  alvo.setDate(hoje.getDate() + ((8 - hoje.getDay()) % 7 || 7));

  const mes = String(alvo.getMonth() + 1).padStart(2, "0");
  const dia = String(alvo.getDate()).padStart(2, "0");

  return `${alvo.getFullYear()}-${mes}-${dia}`;
}

const SEGUNDA = proximaSegunda();
const AULA = "Aula de referência";

test.beforeEach(async () => {
  await limparReservasDeTeste();
});

test.afterAll(async () => {
  await limparReservasDeTeste();
});

for (const [papel, conta] of [
  ["o administrador", ADMIN],
  ["o aluno da turma", ALUNO],
] as const) {
  test(`${papel} vê a reserva aparecer e sumir sem recarregar`, async ({
    page,
  }) => {
    await entrarComo(page, conta);
    await page.goto(semanaDoDia(`${SEGUNDA}T12:00:00-03:00`));
    await expect(page.locator('[data-ao-vivo="conectado"]')).toBeAttached({
      timeout: 15_000,
    });

    await expect(blocoDaReserva(page, AULA)).toHaveCount(0);

    const id = await criarAulaDeReferencia(SEGUNDA);
    await expect(blocoDaReserva(page, AULA)).toBeVisible({ timeout: 15_000 });

    await apagarReserva(id);
    await expect(blocoDaReserva(page, AULA)).toHaveCount(0, {
      timeout: 15_000,
    });
  });
}
