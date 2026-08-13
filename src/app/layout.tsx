import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/ui/header";
import { PageTransitionProvider } from "./components/ui/PageTransition";
import { Jaro } from "next/font/google"; // ← これ

const jaro = Jaro({
  subsets: ["latin"],
  weight: "400",          // Jaro は基本 400。バリアブル対応なら必要に応じて調整
  display: "swap",
  variable: "--font-jaro" // Tailwind で使うためCSS変数に
});

export const metadata: Metadata = {
  title: "Riku Ohashi Portfolio",
  description: "Next.js + TypeScript + Tailwind + Gsap + Three.js",
  // ファビコンは src/app/icon.png（192x192 / 12KB）を Next の規約で自動認識させる。
  // 以前はヘッダー用の 1.5MB のロゴをそのまま指定していた。
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={jaro.variable}>
      <body className="min-h-dvh bg-[#0b0b0b] text-white antialiased">
        {/* ★ ここで全体をラップ */}
        <PageTransitionProvider>
          <Header />
          <div className="w-full pt-16">
            {children}
          </div>
        </PageTransitionProvider>
      </body>
    </html>
  );
}
