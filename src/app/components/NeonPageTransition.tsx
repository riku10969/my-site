"use client";
import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import gsap from "gsap";

/**
 * Page Transition Context
 */
const PageTransitionCtx = createContext<{
  push: (href: string) => void;
  playing: boolean;
} | null>(null);

export function usePageTransition() {
  const ctx = useContext(PageTransitionCtx);
  if (!ctx) throw new Error("usePageTransition must be used within PageTransitionProvider");
  return ctx;
}

/**
 * Provider
 * - 初回ロードでは演出しない
 * - TransitionLink/TransitionButton からのクリック時のみ OUT を再生
 * - 覆われてから push（即 push ではない）
 * - 遷移先で IN を一度だけ再生
 */
export function PageTransitionProvider({
  children,
  accentMint = "#11a98b",
  accentPurple = "#5a37a6",
  duration = 0.9,
  pushAt = 0.4, // 0..1: OUT の進捗がこれを超えたら push
}: {
  children: React.ReactNode;
  accentMint?: string;
  accentPurple?: string;
  duration?: number;
  pushAt?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [playing, setPlaying] = useState(false);

  // CSR 判定（SSR差分回避）
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const layerRef = useRef<HTMLDivElement | null>(null);
  const mintRef = useRef<HTMLDivElement | null>(null);
  const purpleRef = useRef<HTMLDivElement | null>(null);

  const prefersReduced = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // 初期状態セット（入場アニメはしない）
  useLayoutEffect(() => {
    if (!mounted || !layerRef.current) return;

    gsap.set(layerRef.current, { opacity: 0, pointerEvents: "none" });

    if (!mintRef.current || !purpleRef.current) return;

    // 画面外に退避（固定の初期値）
    gsap.set([mintRef.current, purpleRef.current], {
      yPercent: 120,
      xPercent: -40,
      rotation: 3,
      transformOrigin: "50% 50%",
    });
  }, [mounted]);

  // クリック時：OUT を開始し、OUT 進捗が pushAt% を超えたら push
  const push = async (href: string) => {
    if (prefersReduced || !layerRef.current || !mintRef.current || !purpleRef.current) {
      // リデュースモーションでは即遷移（演出なし）
      router.push(href);
      return;
    }

    // 遷移先で IN を予約
    sessionStorage.setItem("pt:pending", "1");
    setPlaying(true);

    // オーバーレイ前面＆初期配置
    gsap.set(layerRef.current, { opacity: 1, pointerEvents: "auto", willChange: "transform, opacity" });
    gsap.set(mintRef.current,  { yPercent: 120, xPercent: -40, rotation: 3, zIndex: 2, willChange: "transform" });
    gsap.set(purpleRef.current,{ yPercent: 120, xPercent: -40, rotation: 3, zIndex: 1, willChange: "transform" });

    // 一度描画（ダブル RAF）→ 覆いが見えてからアニメ開始
    await new Promise<void>((resolve) => {
  requestAnimationFrame(() => {
    // （任意）強制レイアウトで描画を確実に
    layerRef.current?.getBoundingClientRect();
    requestAnimationFrame(() => resolve());
  });
});
    let pushed = false;
    const tl = gsap.timeline({
      onUpdate: () => {
        if (!pushed && tl.progress() >= Math.min(Math.max(pushAt, 0), 1)) {
          pushed = true;
          sessionStorage.setItem("pt:pushed", "1");
          router.push(href);
        }
      },
    });

    tl.to(mintRef.current, {
        yPercent: 0,
        xPercent: 0,
        rotation: 0.4,
        duration,
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

  // 遷移先：IN を一度だけ再生してオーバーレイ解除
  useEffect(() => {
    if (!mounted || !layerRef.current || !mintRef.current || !purpleRef.current) return;
    if (sessionStorage.getItem("pt:pending") !== "1") return;

    // 予約フラグ消去
    sessionStorage.removeItem("pt:pending");
    sessionStorage.removeItem("pt:pushed");

    // 競合回避（OUT が残っていたら止める）
    gsap.killTweensOf([mintRef.current, purpleRef.current, layerRef.current]);

    // 現在：オーバーレイは前面、パネルは画面内にある想定
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(layerRef.current, { opacity: 0, pointerEvents: "none" });
        setPlaying(false);
      },
    });

    tl.to([mintRef.current, purpleRef.current], {
        yPercent: -120,
        xPercent: 40,
        rotation: -2,
        duration: duration * 0.9,
        ease: "power3.inOut",
      }, 0)
      .to(layerRef.current, { opacity: 0, duration: 0.3, ease: "power1.out" }, "-=0.2");
  }, [pathname, mounted, duration]);

  return (
    <PageTransitionCtx.Provider value={{ push, playing }}>
      {children}

      {mounted && (
        <div
          ref={layerRef}
          className="fixed inset-0 z-[99999] pointer-events-none opacity-0"
          aria-hidden="true"
        >
          <div className="absolute inset-0 overflow-hidden">
            {/* Mint panel */}
            <div
              ref={mintRef}
              className="absolute -left-1/3 -top-1/3 h-[160vh] w-[160vw] rounded-[8px]"
              style={{
                background: `linear-gradient(135deg, ${accentMint}, ${accentMint})`,
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
                background: `linear-gradient(135deg, ${accentPurple}, ${accentPurple})`,
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

/**
 * TransitionLink
 * - クリック時のみ演出を発火
 * - 修飾キーや中クリックでは通常の挙動
 */
export function TransitionLink({
  href,
  children,
  className = "",
  prefetch,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
}) {
  const { push, playing } = usePageTransition();

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; // 通常遷移
    e.preventDefault();
    if (!playing) push(href);
  };

  useEffect(() => {
    // 必要に応じて prefetch を行いたい場合は next/link を使う実装に置き換え推奨
  }, [href, prefetch]);

  return (
    <a
      href={href}
      onClick={onClick}
      className={className}
      aria-disabled={playing ? true : undefined}
    >
      {children}
    </a>
  );
}

/**
 * TransitionButton
 */
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
    <button
      onClick={() => !playing && push(href)}
      className={className}
      disabled={playing}
      aria-busy={playing}
    >
      {children}
    </button>
  );
}
