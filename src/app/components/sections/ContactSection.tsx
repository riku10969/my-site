"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";

/* 好みで調整（色相値 0-360） */
const HUE = {
  contact: 170,     // Contact
  me: 300,          // Me
  ig: 330,          // "Instagram :"
  igHandle: 45,     // "riku.1ok6"
  gmail: 200,       // "Gmail :"
  email: 165,       // "riku.1ok6@gmail.com"
};

function useRevealOnce(threshold = 0.3) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || on) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) { setOn(true); io.disconnect(); break; }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [on, threshold]);
  return { ref, on };
}

/* 決定論PRNG（SSR/CSR一致） */
function seedFromString(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function makePRNG(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/* 文字ごとフリッカー */
function NeonText({
  text,
  as: Tag = "div",
  className = "",
  hue,
}: {
  text: string;
  as?: any;
  className?: string;
  hue?: number;
}) {
  const timings = useMemo(() => {
    const prng = makePRNG(seedFromString(text));
    return Array.from({ length: text.length }, () => {
      const dur = 1.2 + prng() * 1.6; // 1.2-2.8s
      const delay = prng() * 0.6;     // 0-0.6s
      return { dur: `${dur.toFixed(2)}s`, delay: `${delay.toFixed(2)}s` };
    });
  }, [text]);

  return (
    <Tag
      className={`neon ${className}`}
      style={
        hue != null
          ? ({
              // @ts-ignore
              "--neon-hue": hue,
            } as React.CSSProperties)
          : undefined
      }
    >
      {text.split("").map((ch, i) => (
        <span
          key={i}
          className="neon neon-char"
          style={
            {
              // @ts-ignore
              "--flickerDur": timings[i].dur,
              "--flickerDelay": timings[i].delay,
            } as React.CSSProperties
          }
        >
          {ch}
        </span>
      ))}
    </Tag>
  );
}

export default function ContactSection() {
  const { ref, on } = useRevealOnce(0.3);

  // 遅延点灯（スクロールで見えて数秒後にパッ）
  const [armed, setArmed] = useState(false);
  const [glow, setGlow] = useState(false);
  useEffect(() => {
    if (!on) return;
    setArmed(true);
    const t = setTimeout(() => setGlow(true), 1600); // ← 点灯までの待ち時間(ms)
    return () => clearTimeout(t);
  }, [on]);

  const stageClass = glow ? "is-on" : armed ? "is-armed" : "is-off";

  return (
    <section
      ref={ref}
      className="contact-section relative w-full py-24 md:py-28"
      style={{} as React.CSSProperties}
    >
      <div className="mx-auto max-w-4xl px-6">
        {/* 見出し：Contact と Me を別色に */}
        <h2 className={`text-center font-extrabold ${stageClass}`}>
          <NeonText
            text="Contact"
            as="span"
            hue={HUE.contact}
            className="inline-block text-[clamp(36px,6vw,72px)]"
          />
          <NeonText
            text=" Me"
            as="span"
            hue={HUE.me}
            className="inline-block text-[clamp(36px,6vw,72px)]"
          />
        </h2>

        <div className="mt-12 space-y-10">
          {/* Instagram 行：ラベルとアカウント名を別色に */}
          <div className={`flex items-center gap-5 ${stageClass}`}>
            <span
              aria-hidden
              className="neon-badge"
              // @ts-ignore
              style={{ "--neon-hue": HUE.ig } as React.CSSProperties}
              title="Instagram"
            >
              IG
            </span>
            <p className="text-[clamp(18px,2.8vw,28px)]">
              <NeonText text="Instagram :" as="span" hue={HUE.ig} className="inline-block" />
              <NeonText text=" riku.1ok6" as="span" hue={HUE.igHandle} className="inline-block" />
            </p>
          </div>

          {/* Gmail 行：ラベルとメールアドレスを別色に */}
          <div className={`flex items-center gap-5 ${stageClass}`}>
            <span
              aria-hidden
              className="neon-badge"
              // @ts-ignore
              style={{ "--neon-hue": HUE.gmail } as React.CSSProperties}
            >
              @
            </span>
            <p className="text-[clamp(18px,2.8vw,28px)]">
              <NeonText text="Gmail :" as="span" hue={HUE.gmail} className="inline-block" />
              <NeonText
                text=" riku.1ok6@gmail.com"
                as="span"
                hue={HUE.email}
                className="inline-block"
              />
            </p>
          </div>

          {/* CTA（メール送信）— 好みで色変更可（今は email 色） */}
          <div className="pt-2">
            <Link
              href="mailto:riku.1ok6@gmail.com"
              className={`inline-block mt-4 neon-link ${stageClass}`}
              // @ts-ignore
              style={{ "--neon-hue": HUE.email } as React.CSSProperties}
            >
              Send an email →
            </Link>
          </div>
        </div>
      </div>

      {/* === CSS（グローバル・このセクション限定） === */}
      <style jsx global>{`
        .contact-section { background: #2f2f2f; }

        /* OFF: 下地だけ（弱発光） */
        .contact-section .neon,
        .contact-section .neon-char,
        .contact-section .neon-link,
        .contact-section .neon-badge {
          position: relative;
          color: hsl(var(--neon-hue, 170) 70% 60% / 0.14);
          text-shadow: none;
          transition: color .28s ease, text-shadow .28s ease,
                      opacity .28s ease, filter .28s ease;
          opacity: .55;
        }
        .contact-section .neon-badge {
          display: inline-grid; place-items: center;
          width: 42px; height: 42px; border-radius: 10px;
          font-weight: 800; letter-spacing: .5px;
          background: hsl(var(--neon-hue, 170) 70% 60% / 0.12);
          box-shadow: 0 0 0 hsl(var(--neon-hue, 170) 90% 50% / 0),
                      inset 0 0 0 hsl(var(--neon-hue, 170) 90% 50% / 0);
        }

        /* ARMED: 見えた後の待機（うっすら） */
        .contact-section .is-armed .neon-char,
        .contact-section .is-armed.neon-link,
        .contact-section .is-armed.neon-badge {
          color: hsl(var(--neon-hue, 170) 85% 65%);
          opacity: .9;
          text-shadow:
            0 0 0.02em hsl(var(--neon-hue, 170) 95% 70% / .55),
            0 0 0.12em hsl(var(--neon-hue, 170) 95% 60% / .25);
        }

        /* ON: 本点灯（パッと） */
        .contact-section .is-on .neon-char,
        .contact-section .is-on.neon-link,
        .contact-section .is-on.neon-badge {
          color: hsl(var(--neon-hue, 170) 92% 72%);
          opacity: 1;
          text-shadow:
            0 0 0.02em hsl(var(--neon-hue, 170) 98% 75% / .95),
            0 0 0.10em hsl(var(--neon-hue, 170) 96% 66% / .55),
            0 0 0.24em hsl(var(--neon-hue, 170) 96% 60% / .38),
            0 0 0.48em hsl(var(--neon-hue, 170) 96% 56% / .28);
          filter: saturate(1.05);
        }
        .contact-section .is-on.neon-badge {
          box-shadow:
            0 0 10px hsl(var(--neon-hue, 170) 98% 60% / .45),
            inset 0 0 6px hsl(var(--neon-hue, 170) 98% 60% / .28);
          background: hsl(var(--neon-hue, 170) 100% 60% / .12);
        }

        /* フリッカーは ON で開始 */
        .contact-section .is-on .neon-char {
          animation: neon-flicker var(--flickerDur) ease-in-out
                     var(--flickerDelay) infinite alternate;
        }

        .contact-section .neon-link.is-on:hover {
          text-shadow:
            0 0 0.04em hsl(var(--neon-hue, 170) 95% 72% / 1),
            0 0 0.16em hsl(var(--neon-hue, 170) 95% 62% / .85),
            0 0 0.36em hsl(var(--neon-hue, 170) 96% 58% / .60);
        }

        @keyframes neon-flicker {
          0%   { opacity: .86; filter: drop-shadow(0 0 0.08em hsl(var(--neon-hue, 170) 100% 60% / .35)); }
          38%  { opacity: 1;   filter: drop-shadow(0 0 0.16em hsl(var(--neon-hue, 170) 100% 60% / .50)); }
          46%  { opacity: .74; filter: drop-shadow(0 0 0.06em hsl(var(--neon-hue, 170) 100% 60% / .28)); }
          62%  { opacity: 1; }
          84%  { opacity: .80; }
          100% { opacity: .95; }
        }

        @media (prefers-reduced-motion: reduce) {
          .contact-section .neon-char { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
