"use client";
import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useEffect, // ← 追加
} from "react";
import { useRouter, usePathname } from "next/navigation";
import gsap from "gsap";

const PageTransitionCtx = createContext<{
  push: (href: string) => void;
  playing: boolean;
} | null>(null);

export function usePageTransition() {
  const ctx = useContext(PageTransitionCtx);
  if (!ctx) throw new Error("usePageTransition must be used within PageTransitionProvider");
  return ctx;
}

export function PageTransitionProvider({
  children,
  accentMint = "#11a98b",
  accentPurple = "#5a37a6",
  duration = 0.9,
}: {
  children: React.ReactNode;
  accentMint?: string;
  accentPurple?: string;
  duration?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [playing, setPlaying] = useState(false);

  // ★ 追加: クライアントマウント後にだけオーバーレイを描画
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const layerRef = useRef<HTMLDivElement | null>(null);
  const mintRef = useRef<HTMLDivElement | null>(null);
  const purpleRef = useRef<HTMLDivElement | null>(null);

  const prefersReduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // 入場（カーテン剥がし）
  useLayoutEffect(() => {
    if (!mounted) return;                 // ← マウント前は触らない
    if (!layerRef.current) return;
    if (prefersReduced) {
      gsap.set([mintRef.current, purpleRef.current], { clearProps: "all" });
      gsap.set(layerRef.current, { opacity: 0, pointerEvents: "none" });
      return;
    }
    const tl = gsap.timeline();
    tl.set(layerRef.current, { opacity: 1, pointerEvents: "none" })
      .to([mintRef.current, purpleRef.current], {
        yPercent: -120,
        xPercent: 40,
        rotation: -3,
        duration: duration * 0.9,
        ease: "power3.inOut",
        stagger: -0.06,
      }, 0)
      .set(layerRef.current, { opacity: 0 });
    return () => tl.kill();
  }, [pathname, duration, prefersReduced, mounted]);

  // 退場（カーテン閉じ → ルーティング）
  const push = (href: string) => {
    if (prefersReduced) {
      router.push(href);
      return;
    }
    if (!layerRef.current) return;
    setPlaying(true);

    const tl = gsap.timeline({
      onComplete: () => {
        router.push(href);
        setPlaying(false);
      },
    });

    tl.set(layerRef.current, { opacity: 1, pointerEvents: "auto" })
      .set([mintRef.current, purpleRef.current], {
        yPercent: 120,
        xPercent: -40,
        rotation: 3,
        transformOrigin: "50% 50%",
      })
      .to(mintRef.current, {
        yPercent: 0,
        xPercent: 0,
        rotation: 0.4,
        duration: duration,
        ease: "power3.inOut",
      }, 0)
      .to(purpleRef.current, {
        yPercent: 0,
        xPercent: 0,
        rotation: 0,
        duration: duration * 0.9,
        ease: "power3.out",
      }, 0.06);
  };

  return (
    <PageTransitionCtx.Provider value={{ push, playing }}>
      {children}

      {/* Overlay Layer */}
      {mounted && ( // ← マウント後だけ描画
        <div
          ref={layerRef}
          className="fixed inset-0 z-[9999] pointer-events-none opacity-0"
          aria-hidden="true" // ← 明示
        >
          <div className="absolute inset-0 overflow-hidden">
            {/* Mint panel */}
            <div
              ref={mintRef}
              className="absolute -left-1/3 -top-1/3 h-[160vh] w-[160vw] rounded-[8px]"
              style={{
                background: `linear-gradient(135deg, ${accentMint}, ${accentMint}cc)`,
                clipPath: "polygon(0% 10%, 86% 0%, 100% 90%, 12% 100%)",
                boxShadow: "0 0 0 rgba(0,0,0,0)",
                mixBlendMode: "normal",
                filter: "none",
              }}
            />
            {/* Purple panel */}
            <div
              ref={purpleRef}
              className="absolute -left-1/4 -top-1/4 h-[160vh] w-[160vw] rounded-[8px]"
              style={{
                background: `linear-gradient(135deg, ${accentPurple}, ${accentPurple}cc)`,
                clipPath: "polygon(8% 0%, 100% 12%, 92% 100%, 0% 88%)",
                boxShadow: "0 0 0 rgba(0,0,0,0)",
                mixBlendMode: "normal",
                filter: "none",
              }}
            />
          </div>
        </div>
      )}
    </PageTransitionCtx.Provider>
  );
}

export function TransitionLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { push, playing } = usePageTransition();
  return (
    <a
      href={href}
      onClick={(e) => { e.preventDefault(); if (!playing) push(href); }}
      className={className}
    >
      {children}
    </a>
  );
}

export function TransitionButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { push, playing } = usePageTransition();
  return (
    <button onClick={() => !playing && push(href)} className={className}>
      {children}
    </button>
  );
}
