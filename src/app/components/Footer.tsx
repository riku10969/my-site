// /components/Footer.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function LogoStack() {
  return (
    <div className="relative select-none [text-shadow:0_2px_0_rgba(0,0,0,.08),0_8px_20px_rgba(0,0,0,.25)] logo-breathe">
      <div className="font-extrabold leading-none text-[34px] -rotate-6" style={{ color: "#f2c335" }}>
        UI UX
      </div>
      <div className="font-extrabold leading-none text-[34px] -mt-1 rotate-3" style={{ color: "#35bcd0" }}>
        Designer
      </div>
      <div className="font-extrabold leading-none text-[28px] -mt-1 -rotate-2" style={{ color: "#7b39b7" }}>
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
          const t = setTimeout(() => setNeonStage("idle"), 1000); // 0.9s後に切替
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
      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight || 1;

      // フッター上端が viewport 下端(vh) に来た時 0、上端が (vh - 高さ) で 1
      const pRaw = (vh - rect.top) / Math.max(rect.height, 1);
      const p = Math.max(0, Math.min(1, pRaw)); // clamp 0..1

      const y = 24 + ( -30 * p );           // 24px → -6px
      const o = 0 + ( 0.28 * p );           // 0 → 0.28
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
    <footer ref={hostRef} className="footer-theme-a footer--purpleGreen relative overflow-hidden">
      {/* シマー（超弱） */}
      <div className="absolute inset-0 footer-shine" />

      {/* 背景ウォーターマーク */}
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center">
        <p className="watermark select-none font-serif tracking-wide text-neutral-500/90
                       text-[clamp(28px,9vw,120px)] leading-none pb-4">
          Thank You For Watch
        </p>
      </div>

      {/* 内容 */}
      <div className="relative mx-auto grid max-w-6xl grid-cols-[auto_1fr] items-center gap-8 px-6 py-7 md:py-9">
        <LogoStack />

        <nav className="justify-self-center">
          <ul className="flex items-center gap-12 md:gap-20 text-[22px] md:text-[26px] tracking-wide">
            {[
              { href: "/", label: "TOP" },
              { href: "/project/about", label: "About" },
              { href: "/project/works", label: "Works" },
              { href: "/project/contact", label: "Contact" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`link-glow text-[color:var(--a1)] rounded
                 focus:outline-none focus:ring-2 focus:ring-[color:var(--a2)]/30 ${neonClass}`}
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
