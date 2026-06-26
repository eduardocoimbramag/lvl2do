import type { Metadata, Viewport } from "next";
import { Sora, Manrope } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

// Sora -> títulos / display
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

// Manrope -> textos / corpo
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "lvl2do — Seu desenvolvimento em jogo",
  description:
    "Transforme sua rotina em missões. Ganhe XP, mantenha sua sequência diária e acompanhe sua evolução com dashboards simples e inteligentes.",
  keywords: ["produtividade", "gamificação", "checklist", "missões", "XP", "hábitos"],
};

export const viewport: Viewport = {
  themeColor: "#050509",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${sora.variable} ${manrope.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
