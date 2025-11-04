import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/header";
import BackgroundStage from "./components/canvas/BackgroundStage";
import RouteLogoController from "./components/RouteLogoController";
import IntroGate from "./components/IntoroGate";
import { PageTransitionProvider } from "./components/NeonPageTransition";
import { Jaro } from "next/font/google"; // ← これ

const jaro = Jaro({
  subsets: ["latin"],
  weight: "400",          // Jaro は基本 400。バリアブル対応なら必要に応じて調整
  display: "swap",
  variable: "--font-jaro" // Tailwind で使うためCSS変数に
});

export const metadata: Metadata = {
  title: "Riku Ohashi Portfolio",
  description: "Next.js + TypeScript + Tailwind starter",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={jaro.variable}>
      <body className="min-h-dvh bg-[#0b0b0b] text-white antialiased">
        {/* ★ ここで全体をラップ */}
        <PageTransitionProvider>
          <Header />
          {/* 必要なら以下のコンポーネントもここに置く */}
          {/* <BackgroundStage /> */}
          {/* <RouteLogoController/> */}
          {/* <IntroGate>
            <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
          </IntroGate> */}
          <div className="w-full pt-16">
            {children}
          </div>
        </PageTransitionProvider>
      </body>
    </html>
  );
}
