// src/app/not-found.tsx
import type { Metadata } from "next";
import Footer from "./components/ui/Footer";
import GlitchText from "./components/ui/GlitchText";
import { TransitionLink } from "./components/ui/PageTransition";

export const metadata: Metadata = {
  title: "404 – Not Found",
  robots: { index: false, follow: false },
};

/** ヘッダーと同じ並び。404 からでもそのまま各セクションへ飛べるようにする */
const SECTION_LINKS = [
  { label: "About", path: "/project/about" },
  { label: "Works", path: "/project/works" },
  { label: "Contact", path: "/project/contact" },
];

export default function NotFound() {
  return (
    <>
      <main className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden bg-[#121316] px-6 py-20 text-white">
        {/* 背景：グリッド＋ネオンの滲み＋走査線（トップの砂嵐背景に寄せた質感） */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(60% 45% at 22% 28%, rgba(44,205,185,0.16), transparent 70%), radial-gradient(55% 45% at 80% 72%, rgba(168,85,247,0.16), transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-overlay"
          aria-hidden
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.5) 2px 4px)",
          }}
        />

        <div className="relative z-10 w-full max-w-3xl text-center">
          {/* 404：ネオン管＋グリッチ。
              最後の「4」だけ別要素にして、演出後に切れかけの点滅をさせる */}
          <p
            className="neon-cyan font-display flex items-baseline justify-center text-[clamp(96px,26vw,220px)] leading-[0.9] tracking-[0.06em] select-none"
            aria-hidden
          >
            <GlitchText as="span" text="40" trigger="mount" />
            {/* neon-dying は GlitchText の外側に置く。
                同じ要素にすると .glitch.on（詳細度 0,2,0）が animation を
                上書きしてチカチカが効かなくなる */}
            <span className="neon-dying">
              <GlitchText as="span" text="4" trigger="mount" />
            </span>
          </p>
          <span className="sr-only">404</span>

          <h1 className="font-display mt-4 text-[clamp(30px,7vw,60px)] leading-tight tracking-[0.14em] text-white [text-shadow:_0_0_18px_rgba(255,255,255,0.35),_0_0_40px_rgba(255,255,255,0.15)]">
            NOT FOUND
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm font-medium tracking-[0.2em] text-[#c4a8ff]/90 uppercase md:text-base">
            Page does not exist
          </p>

          <p className="mx-auto mt-8 max-w-[38ch] text-[15px] leading-[1.9] text-[#d6d8de] md:text-[17px]">
            お探しのページは見つかりませんでした。
            <br className="hidden sm:block" />
            URLが変更されたか、削除された可能性があります。
          </p>

          {/* トップへ戻る（My Strength ボタンと同じ質感） */}
          <div className="mt-10 flex justify-center">
            <TransitionLink
              href="/"
              className="rounded-xl border border-[#A855F7]/40 bg-[#2ccdb9]/15 px-7 py-3.5 font-serif text-lg font-bold text-white
                         backdrop-blur-sm transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out
                         hover:border-[#A855F7]/50 hover:bg-[#A855F7]/25 hover:shadow-[0_0_24px_rgba(168,85,247,0.25)]
                         active:scale-[0.98] md:px-9 md:py-4 md:text-xl
                         [text-shadow:_0_0_20px_rgba(255,255,255,0.3),_0_1px_2px_rgba(0,0,0,0.5)]"
            >
              Back to Top
            </TransitionLink>
          </div>

          {/* 各セクションへの導線（ヘッダーと同じホバー表現） */}
          <nav className="mt-12" aria-label="Site sections">
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:gap-x-14">
              {SECTION_LINKS.map((item) => (
                <li key={item.path}>
                  <TransitionLink
                    href={item.path}
                    className="group/ni relative inline-block text-[1.05rem] font-semibold text-white transition-colors hover:text-cyan-200"
                  >
                    <span className="relative">
                      {item.label}
                      <span
                        className="absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 bg-cyan-300
                                   transition-transform duration-300 group-hover/ni:scale-x-100"
                        aria-hidden
                      />
                    </span>
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </main>

      <Footer />
    </>
  );
}
