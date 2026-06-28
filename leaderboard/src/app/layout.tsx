import type { Metadata } from "next";
import { Urbanist, Barlow, JetBrains_Mono, Prompt } from "next/font/google";
import { RainbowBar } from "@/components/RainbowBar";
import "./globals.css";

const urbanist = Urbanist({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const barlow = Barlow({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const prompt = Prompt({
  variable: "--font-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "AR Overlay — Tournament Standings",
  description: "Arc Raiders tournament leaderboard — Битва за Респект. Следи за рейтингом игроков и команд.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Битва за Респект — AR Overlay",
    description: "Турнирная таблица сообщества Arc Raiders",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${urbanist.variable} ${barlow.variable} ${jetbrainsMono.variable} ${prompt.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col grunge-overlay bg-full-dark">
        <RainbowBar />
        {children}
      </body>
    </html>
  );
}
