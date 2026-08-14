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
      {/* 背景色は globals.css の :root（--background）で一元管理する。
          ここで bg-* を当てると詳細度で勝ってしまい、globals.css 側が
          !important を使わないと効かなくなる */}
      <body className="min-h-dvh text-white antialiased">
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
