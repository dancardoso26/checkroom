import { TelaDeEntrada } from "@/components/tela-de-entrada";
import { FormularioDeLogin } from "./formulario";

export const metadata = { title: "Entrar | CheckRoom" };

// Motivos de voltar ao login vindos de fora da tela, como o link de um e-mail.
const AVISOS: Record<string, string> = {
  link_invalido:
    "O link de recuperação está incompleto. Peça um novo em Esqueci minha senha.",
  link_expirado:
    "O link de recuperação expirou ou já foi usado. Peça um novo em Esqueci minha senha.",
  "conta=removida": "Sua conta foi removida.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string; erro?: string; conta?: string }>;
}) {
  const { proximo, erro, conta } = await searchParams;
  const aviso =
    (erro && AVISOS[erro]) ||
    (conta === "removida" && AVISOS["conta=removida"]);

  return (
    <TelaDeEntrada titulo="Entre na sua conta">
      {aviso && (
        <p
          role="alert"
          className="border-warning/40 bg-warning-subtle text-warning rounded-md border px-3 py-2 text-sm"
        >
          {aviso}
        </p>
      )}

      <div className="bg-card rounded-lg border p-6">
        <FormularioDeLogin proximo={proximo} />
      </div>
    </TelaDeEntrada>
  );
}
