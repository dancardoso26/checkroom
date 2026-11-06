import { test, expect } from "@playwright/test";
import { ADMIN, ALUNO, PROFESSOR, entrarComo } from "./helpers/autenticacao";
import {
  dataDaqui,
  limparCadastrosDeTeste,
  limparReservasDeTeste,
  listarEspacos,
  listarProfessores,
  listarTurmas,
  inserirReservaDireto,
  PREFIXO_TESTE,
} from "./helpers/banco";
import { cadastrarPalestra, preencherPalestra } from "./helpers/palestra";

const DATA = dataDaqui(40);

test.beforeEach(async () => {
  await limparCadastrosDeTeste();
  await limparReservasDeTeste();
});

test.afterAll(async () => {
  await limparCadastrosDeTeste();
  await limparReservasDeTeste();
});

test("palestra sem curso de destino não pode ser cadastrada", async ({
  page,
}) => {
  await entrarComo(page, ADMIN);
  const painel = await preencherPalestra(page, {
    titulo: `${PREFIXO_TESTE} Sem curso`,
    espaco: "3T-12",
    data: DATA,
    vagas: "50",
    inicio: "19:00",
    fim: "21:00",
    cursos: [],
  });

  await expect(
    painel.getByRole("button", { name: "Cadastrar palestra" })
  ).toBeDisabled();
});

test("espaço ocupado não é oferecido para a palestra", async ({ page }) => {
  const [espacos, professores, turmas] = await Promise.all([
    listarEspacos(),
    listarProfessores(),
    listarTurmas(),
  ]);
  const reserva = await inserirReservaDireto({
    room_id: espacos.find((e) => e.name === "3T-12")!.id,
    professor_id: professores.find((p) => p.name === "Marina Alves Prado")!.id,
    class_id: turmas.find((t) => t.name === "ENF 6º semestre A")!.id,
    purpose: `${PREFIXO_TESTE} Seminário no auditório`,
    starts_at: `${DATA}T13:30:00-03:00`,
    ends_at: `${DATA}T14:30:00-03:00`,
  });
  expect(reserva.aceitou, reserva.mensagem ?? undefined).toBe(true);

  await entrarComo(page, ADMIN);
  const painel = await preencherPalestra(page, {
    titulo: `${PREFIXO_TESTE} Conflitante`,
    data: DATA,
    vagas: "50",
    inicio: "13:00",
    fim: "15:00",
    cursos: ["Sistemas de Informação"],
  });

  const campoDoEspaco = painel.getByLabel("Espaço", { exact: true });
  await expect(campoDoEspaco).toBeEnabled();
  await campoDoEspaco.click();
  await expect(page.getByRole("option", { name: /3T-11/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /3T-12/ })).toHaveCount(0);
  await expect(page.getByRole("option", { name: /3T-11/ })).toBeVisible();
});

test("vagas acima da capacidade do espaço são recusadas", async ({ page }) => {
  await entrarComo(page, ADMIN);
  const painel = await preencherPalestra(page, {
    titulo: `${PREFIXO_TESTE} Lotação`,
    espaco: "3T-12",
    data: DATA,
    vagas: "500",
    inicio: "09:00",
    fim: "10:00",
    cursos: ["Sistemas de Informação"],
  });

  await expect(painel.getByText(/O espaço comporta no máximo/)).toBeVisible();
  await expect(
    painel.getByRole("button", { name: "Cadastrar palestra" })
  ).toBeDisabled();
});

test("o aluno do curso se inscreve e cancela; o de outro curso nem vê", async ({
  page,
}) => {
  const doCurso = `${PREFIXO_TESTE} Segurança da informação`;
  const deOutroCurso = `${PREFIXO_TESTE} Saúde mental`;

  await entrarComo(page, ADMIN);
  let painel = await cadastrarPalestra(page, {
    titulo: doCurso,
    espaco: "3T-12",
    data: DATA,
    vagas: "40",
    inicio: "08:00",
    fim: "10:00",
    cursos: ["Sistemas de Informação"],
  });
  await expect(painel).toBeHidden();

  painel = await cadastrarPalestra(page, {
    titulo: deOutroCurso,
    espaco: "3T-12",
    data: DATA,
    vagas: "40",
    inicio: "14:00",
    fim: "16:00",
    cursos: ["Enfermagem"],
  });
  await expect(painel).toBeHidden();

  await page.context().clearCookies();
  await entrarComo(page, ALUNO);
  await page.goto("/palestras");

  await expect(page.locator(`[data-palestra="${deOutroCurso}"]`)).toHaveCount(
    0
  );

  const cartao = page.locator(`[data-palestra="${doCurso}"]`);
  await expect(cartao.getByText("Inscrições abertas")).toBeVisible();
  await cartao.getByRole("button", { name: "Inscrever-se" }).click();

  await expect(cartao).toHaveCount(0);

  await page.getByRole("tab", { name: /^Inscrito/ }).click();
  const inscrito = page.locator(`[data-palestra="${doCurso}"]`);
  await expect(inscrito.getByText("1 de 40 inscritos")).toBeVisible();
  await expect(
    inscrito.getByRole("button", { name: "Inscrever-se" })
  ).toHaveCount(0);

  await inscrito.getByRole("button", { name: "Cancelar inscrição" }).click();
  await expect(inscrito).toHaveCount(0);

  await page.getByRole("tab", { name: /^Abertas/ }).click();
  await expect(cartao.getByText("0 de 40 inscritos")).toBeVisible();
});

test("o aluno não se inscreve em duas palestras no mesmo horário", async ({
  page,
}) => {
  const primeira = `${PREFIXO_TESTE} Palestra A`;
  const segunda = `${PREFIXO_TESTE} Palestra B`;

  await entrarComo(page, ADMIN);
  let painel = await cadastrarPalestra(page, {
    titulo: primeira,
    espaco: "3T-12",
    data: DATA,
    vagas: "40",
    inicio: "08:00",
    fim: "10:00",
    cursos: ["Sistemas de Informação"],
  });
  await expect(painel).toBeHidden();

  painel = await cadastrarPalestra(page, {
    titulo: segunda,
    espaco: "3T-11",
    data: DATA,
    vagas: "40",
    inicio: "09:00",
    fim: "11:00",
    cursos: ["Sistemas de Informação"],
  });
  await expect(painel).toBeHidden();

  await page.context().clearCookies();
  await entrarComo(page, ALUNO);
  await page.goto("/palestras");

  await page
    .locator(`[data-palestra="${primeira}"]`)
    .getByRole("button", { name: "Inscrever-se" })
    .click();
  await expect(page.locator(`[data-palestra="${primeira}"]`)).toHaveCount(0);

  await page
    .locator(`[data-palestra="${segunda}"]`)
    .getByRole("button", { name: "Inscrever-se" })
    .click();

  const aviso = page.getByRole("dialog", { name: "Conflito de horário" });
  await expect(aviso).toBeVisible();
  await expect(aviso.getByText(/outra palestra neste horário/)).toBeVisible();
  await aviso.getByRole("button", { name: "Entendi" }).click();
  await expect(aviso).toBeHidden();
  await expect(page.locator(`[data-palestra="${segunda}"]`)).toBeVisible();
});

test("professor vê as palestras, mas não cadastra nem se inscreve", async ({
  page,
}) => {
  await entrarComo(page, PROFESSOR);
  await page.goto("/palestras");

  await expect(page.getByRole("heading", { name: "Palestras" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nova palestra" })).toHaveCount(
    0
  );
  await expect(page.getByRole("button", { name: "Inscrever-se" })).toHaveCount(
    0
  );
});
