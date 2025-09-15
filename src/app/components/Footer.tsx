// /components/Footer.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function LogoStack() {
  return (
    <div className="relative select-none [text-shadow:0_2px_0_rgba(0,0,0,.08),0_8px_20px_rgba(0,0,0,.25)] logo-breathe mx-auto md:mx-0">
      <div className="font-extrabold leading-none text-[28px] sm:text-[32px] md:text-[34px] -rotate-6" style={{ color: "#f2c335" }}>
        UI UX
      </div>
      <div className="font-extrabold leading-none text-[28px] sm:text-[32px] md:text-[34px] -mt-1 rotate-3" style={{ color: "#35bcd0" }}>
        Designer
      </div>
      <div className="font-extrabold leading-none text-[24px] sm:text-[26px] md:text-[28px] -mt-1 -rotate-2" style={{ color: "#7b39b7" }}>
        RIKU
      </div>
    </div>
  );
}

export default function Footer() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [neonStage, setNeonStage] = useState<"off"|"once"|"idle">("off");

  // ① ビューポート到達で一度だけ点灯 → その後ゆらぎ
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && neonStage === "off") {
          setNeonStage("once");
          const t = setTimeout(() => setNeonStage("idle"), 1000);
          return () => clearTimeout(t);
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [neonStage]);

  // ② ほんのりパララックス（ウォーターマーク）
  useEffect(() => {
    const wrap = hostRef.current;
    if (!wrap) return;

    let raf = 0;
    const onFrame = () => {
      // reduce-motion ならスキップ
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const pRaw = (vh - rect.top) / Math.max(rect.height, 1);
      const p = Math.max(0, Math.min(1, pRaw)); // clamp 0..1

      const y = 24 + (-30 * p);   // 24px → -6px
      const o = 0 + (0.28 * p);   // 0   → 0.28
      wrap.style.setProperty("--wm-y", `${y}px`);
      wrap.style.setProperty("--wm-o", `${o}`);

      raf = requestAnimationFrame(onFrame);
    };
    raf = requestAnimationFrame(onFrame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const neonClass =
    neonStage === "off" ? "" :
    neonStage === "once" ? "footer-neon-once" : "footer-neon-idle";

  return (
    <footer
      ref={hostRef}
      className="
        footer-theme-a footer--purpleGreen
        relative overflow-hidden
        px-4 sm:px-6
      "
    >
      {/* シマー（超弱） */}
      <div className="absolute inset-0 footer-shine" />

      {/* 背景ウォーターマーク（極小では非表示） */}
      <div className="pointer-events-none absolute inset-0 hidden sm:flex items-end justify-center">
        <p
          className="
            watermark select-none font-serif tracking-wide text-neutral-500/90
            leading-none pb-4
          "
          style={{
            // 極小〜大画面まで滑らかに調整
            fontSize: "clamp(22px, 8vw, 120px)",
            transform: "translateY(var(--wm-y, 24px))",
            opacity: "var(--wm-o, 0)",
          }}
        >
          Thank You For Watch
        </p>
      </div>

      {/* 内容：モバイルは縦並び、md以上でロゴ＋ナビ横並び */}
      <div
        className="
          relative mx-auto w-full max-w-6xl
          grid grid-cols-1 gap-8
          py-8 sm:py-9 md:py-10
          md:grid-cols-[auto_1fr] md:items-center
        "
      >
        {/* ロゴ（モバイルは中央寄せ） */}
        <LogoStack />

        {/* ナビ：モバイル=2列グリッド / タブレット=等間隔 / PC=大きめ間隔 */}
        <nav className="justify-self-center w-full md:w-auto">
          <ul
            className="
              grid grid-cols-2 gap-4
              sm:grid-cols-4 sm:gap-6
              md:flex md:flex-wrap md:gap-12 lg:gap-20
              text-[18px] sm:text-[20px] md:text-[22px] lg:text-[26px]
              tracking-wide
              justify-items-center md:justify-items-start
            "
          >
            {[
              { href: "/", label: "TOP" },
              { href: "/project/about", label: "About" },
              { href: "/project/works", label: "Works" },
              { href: "/project/contact", label: "Contact" },
            ].map((item) => (
              <li key={item.href} className="w-full sm:w-auto">
                <Link
                  href={item.href}
                  className={`
                    link-glow ${neonClass}
                    inline-flex items-center justify-center
                    rounded px-3 py-2 sm:px-3.5 sm:py-2.5
                    text-[color:var(--a1)]
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a2)]/40
                    transition-colors
                  `}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
