import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/header";
import "./globals.css";
import BackgroundStage from "./components/canvas/BackgroundStage";
import RouteLogoController from "./components/RouteLogoController";
import IntroGate from "./components/IntoroGate";


export const metadata: Metadata = {
  title: "My Site",
  description: "Next.js + TypeScript + Tailwind starter",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-dvh bg-[#0b0b0b] text-white antialiased">
        <Header />
         {/* <BackgroundStage />
         <RouteLogoController/> */}
         {/* <IntroGate>
          <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
        </IntroGate> */}
        <div className="w-full pt-16">
          {children}
        </div>
      </body>
    </html>
  );
}