import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
