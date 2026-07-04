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
      <body className="min-h-full flex flex-col grunge-overlay">
        <RainbowBar />
        {/* Header */}
        <header className="sticky top-1 z-50 mx-auto w-full max-w-4xl mt-6 mb-2">
          <nav className="dark-panel-glass px-6 py-3 flex items-center justify-between gap-6">
            <a href="/" className="flex items-center gap-3 no-underline">
              <span className="font-heading font-extrabold text-lg tracking-[0.04em] uppercase text-text-primary crt-glow">
                ARC<span className="text-accent-primary">Raiders</span>
              </span>
            </a>
            <div className="flex items-center gap-1">
              <a href="/" className="nav-link active">Главная</a>
              <a href="/standings" className="nav-link">Рейтинг</a>
            </div>
          </nav>
        </header>
        {children}
        {/* Footer */}
        <footer className="site-footer mt-auto">
          <p>
            ARC Raiders &copy; {new Date().getFullYear()} ·{' '}
            <a href="https://arcraiders.com" target="_blank" rel="noopener noreferrer">
              arcraiders.com
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
