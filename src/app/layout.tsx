import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

/**
 * A fonte é carregada pelo next/font em vez de uma tag <link> para o Google
 * Fonts. A diferença prática é que o arquivo da fonte passa a ser servido junto
 * com a aplicação, o que elimina uma requisição a servidor externo e evita o
 * salto de layout que acontece quando o texto é desenhado primeiro com a fonte
 * do sistema e depois trocado.
 *
 * A opção "variable" expõe a fonte como variável CSS, que é consumida em
 * globals.css através de --font-sans.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CheckRoom",
  description:
    "Sistema de gestão de espaços e eventos acadêmicos para instituições de ensino superior.",
  icons: {
    icon: "/favico-checkroom.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // lang="pt-BR" não é detalhe: é o que informa ao leitor de tela em que
    // idioma pronunciar o conteúdo da página.
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
