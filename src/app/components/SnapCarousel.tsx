"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/*********************************
 * SnapCarousel.tsx (Swiper代替)
 * - iOS Safari で安定する CSS Scroll Snap 方式
 * - 依存ゼロ / タッチ慣性 / オートプレイ / ドット / 前後ボタン
 * - SSR/Next.js 対応、安全な計算とガードあり
 *********************************/

export type SlideItem = {
  /** 画像のパス（Next/Image を使いたい場合はこのまま <img> でOK。必要なら差し替え） */
  image: string;
  /** タイトル（カード上に表示し、aria-label にも使用） */
  title: string;
  /** ナビゲーション用。指定されたらクリックで遷移 */
  path?: string;
  /** img の alt。未指定なら title を代用 */
  alt?: string;
};

type SnapCarouselProps = {
  items: SlideItem[];
  /** オートプレイ間隔(ms)。0 で無効。既定: 3200 */
  autoPlayMs?: number;
  /** ドット表示の有無 */
  showDots?: boolean;
  /** 前後ボタン表示の有無 */
  showArrows?: boolean;
  /** カードのアスペクト（w:h）。既定 16/10（やや横長） */
  aspect?: number;
  /** 外側ラッパに追加クラス */
  className?: string;
  /** スライド切替時コールバック */
  onChange?: (index: number) => void;
};

function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setPrefers(mql.matches);
    handler();
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, []);
  return prefers;
}

export default function SnapCarousel({
  items,
  autoPlayMs = 3200,
  showDots = true,
  showArrows = true,
  aspect = 16 / 10,
  className = "",
  onChange,
}: SnapCarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);
  const prefersReduced = usePrefersReducedMotion();

  // スクロール位置から最寄りのスライド index を計算
  const computeActive = useCallback(() => {
    const el = containerRef.current;
    if (!el) return 0;
    const children = Array.from(el.children) as HTMLElement[];
    if (!children.length) return 0;
    const center = el.scrollLeft + el.clientWidth / 2;
    let bestIdx = 0;
    let bestDist = Infinity;
    children.forEach((child, i) => {
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const d = Math.abs(childCenter - center);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    return bestIdx;
  }, []);

  // スクロール監視（requestAnimationFrame でスロットリング）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const idx = computeActive();
        setActive((prev) => (prev !== idx ? idx : prev));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [computeActive]);

  // active 変化時に通知
  useEffect(() => {
    onChange?.(active);
  }, [active, onChange]);

  const scrollToIndex = useCallback((i: number) => {
    const el = containerRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    const target = children[i];
    if (!target) return;
    const left = target.offsetLeft - (el.clientWidth - target.clientWidth) / 2;
    el.scrollTo({ left, behavior: "smooth" });
  }, []);

  const next = useCallback(() => {
    if (!containerRef.current) return;
    const n = containerRef.current.children.length;
    const ni = (active + 1) % n;
    scrollToIndex(ni);
  }, [active, scrollToIndex]);

  const prev = useCallback(() => {
    if (!containerRef.current) return;
    const n = containerRef.current.children.length;
    const pi = (active - 1 + n) % n;
    scrollToIndex(pi);
  }, [active, scrollToIndex]);

  // オートプレイ（ユーザー操作やタブ非表示、PRM に配慮）
  useEffect(() => {
    if (prefersReduced || autoPlayMs <= 0) return;
    let id: number | null = null;
    const tick = () => {
      if (!pausedRef.current) next();
      id = window.setTimeout(tick, autoPlayMs);
    };
    id = window.setTimeout(tick, autoPlayMs);
    const vis = () => {
      pausedRef.current = document.hidden || pausedRef.current;
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      if (id) clearTimeout(id);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [autoPlayMs, next, prefersReduced]);

  // マウス/タッチの一時停止制御
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const pause = () => (pausedRef.current = true);
    const resume = () => (pausedRef.current = false);
    el.addEventListener("pointerdown", pause);
    el.addEventListener("pointerup", resume);
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);
    el.addEventListener("focusin", pause);
    el.addEventListener("focusout", resume);
    return () => {
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("pointerup", resume);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
      el.removeEventListener("focusin", pause);
      el.removeEventListener("focusout", resume);
    };
  }, []);

  const aspectPaddingTop = useMemo(() => `${100 / aspect}%`, [aspect]);

  return (
    <div
      className={`relative w-full select-none ${className}`}
      aria-roledescription="carousel"
    >
      {/* マスク（端をフェード） */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        }}
      />

      {/* トラック */}
      <div
        ref={containerRef}
        className="relative flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden gap-5 px-6 py-6 md:gap-7 md:px-8 md:py-8 [-webkit-overflow-scrolling:touch] scroll-smooth"
        style={{ overscrollBehaviorX: "contain" }}
      >
        {items.map((it, i) => (
          <SlideCard
            key={i}
            item={it}
            active={i === active}
            aspectPaddingTop={aspectPaddingTop}
          />
        ))}
      </div>

      {/* 前後ボタン */}
      {showArrows && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={prev}
            className="absolute left-1.5 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold shadow-md ring-1 ring-black/10 backdrop-blur hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:left-3"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={next}
            className="absolute right-1.5 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold shadow-md ring-1 ring-black/10 backdrop-blur hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:right-3"
          >
            ›
          </button>
        </>
      )}

      {/* ドット */}
      {showDots && (
        <div className="absolute bottom-2 left-0 right-0 z-20 flex items-center justify-center gap-2 md:bottom-3">
          {items.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => scrollToIndex(i)}
              className={`h-1.5 w-5 rounded-full transition-[width,opacity] duration-300 ${
                i === active ? "w-8 bg-white/90" : "bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SlideCard({
  item,
  active,
  aspectPaddingTop,
}: {
  item: SlideItem;
  active: boolean;
  aspectPaddingTop: string;
}) {
  const router = useRouter();
  const onClick = useCallback(() => {
    if (item.path) router.push(item.path);
  }, [item.path, router]);

  return (
    <div
      role="group"
      aria-label={item.title}
      tabIndex={0}
      className={`snap-center shrink-0 w-[84vw] max-w-[640px] md:w-[62vw] md:max-w-[720px] relative rounded-2xl shadow-xl ring-1 ring-white/10 overflow-hidden bg-neutral-900/30 backdrop-blur-sm transition-transform duration-500 will-change-transform ${
        active ? "scale-[1.02]" : "scale-95"
      }`}
      onClick={onClick}
    >
      {/* アスペクト比ボックス */}
      <div style={{ paddingTop: aspectPaddingTop }} />

      {/* 実画像 */}
      <img
        src={item.image}
        alt={item.alt || item.title}
        className="absolute inset-0 h-full w-full object-cover [backface-visibility:hidden] [transform:translateZ(0)]"
        draggable={false}
      />

      {/* タイトルオーバーレイ */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 md:p-5">
        <div className="inline-flex max-w-[90%] items-center gap-2 rounded-xl bg-black/35 px-3 py-1.5 text-white shadow-md ring-1 ring-white/10 backdrop-blur">
          <span className="text-base font-semibold tracking-wide md:text-lg">
            {item.title}
          </span>
        </div>
      </div>
    </div>
  );
}

/*********************************
 * 置き換え例：ProjectsIntroReplacement
 * - 既存の Swiper ベースをこれに差し替え
 *********************************/

export function ProjectsIntroReplacement() {
  const items: SlideItem[] = [
    { title: "About", image: "/projects/project1.jpg", path: "/project/about" },
    { title: "Works", image: "/projects/project2.jpg", path: "/project/works" },
    { title: "Contact", image: "/projects/project3.jpg", path: "/project/contact" },
  ];

  return (
    <div className="relative grid min-h-[100svh] place-items-center bg-[#0b0b0c]">
      <SnapCarousel items={items} autoPlayMs={2800} />
    </div>
  );
}

/*********************************
 * 実装メモ（iOSでの安定化ポイント）
 * - transform/opacity のみで軽い演出。position: fixed + transform の組合せを避ける。
 * - -webkit-overflow-scrolling: touch と scroll-snap を併用。
 * - 端のマスクを mask-image で実装（iOS Safari対応に Webkit 接頭辞も指定）。
 * - requestAnimationFrame で scroll イベントを間引き、アクティブ算出を安定。
 * - PRM（reduced motion）とユーザー操作でオートプレイを自動停止。
 *********************************/
