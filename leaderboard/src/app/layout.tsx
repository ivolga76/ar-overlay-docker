import type { Metadata } from "next";
import { Urbanist, Barlow, JetBrains_Mono, Prompt } from "next/font/google";
import { RainbowBar } from "@/components/RainbowBar";
import "./globals.css";

const urbanist = Urbanist({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const barlow = Barlow({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const prompt = Prompt({
  variable: "--font-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Битва за Респект — рейтинг ARC Raiders",
  description:
    "Лидерборд киберспортивных турниров по ARC Raiders: сезоны, MMR, режимы 1x1 и 2x2, архив матчей.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Битва за Респект — рейтинг ARC Raiders",
    description: "Турнирная таблица сообщества ARC Raiders",
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
      <body className="min-h-full flex flex-col grunge-overlay leaderboard-shell">
        <RainbowBar />
        <header className="sticky top-3 z-50 mx-auto w-full max-w-6xl px-4 pt-2">
          <nav className="leaderboard-nav">
            <a href="/" className="brand-lockup no-underline" aria-label="Главная">
              <span className="brand-mark">AR</span>
              <span>
                <span className="brand-title">Битва за Респект</span>
                <span className="brand-subtitle">ARC Raiders tournament</span>
              </span>
            </a>
            <div className="nav-actions">
              <a href="/" className="nav-link">Главная</a>
              <a href="/standings" className="nav-link">Рейтинг</a>
              <a href="/archive" className="nav-link">Архив</a>
              <a href="/rules" className="nav-link">Правила</a>
              <a href="/login" className="nav-link nav-link-accent">Вход</a>
            </div>
          </nav>
        </header>
        {children}
        <footer className="site-footer mt-auto">
          <p>
            Битва за Респект · ARC Raiders tournament platform ·{" "}
            <a href="https://arcraiders.com" target="_blank" rel="noopener noreferrer">
              arcraiders.com
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
