/**
 * PageTransition
 *
 * ページ遷移の演出を統一管理
 * - 通常: タイルが覆う演出（TileTransition）
 * - /skills への遷移時のみ: ミント・パープルパネル演出（NeonPanelTransition）
 */
"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useTileTransition, type TransitionTheme } from "../gsap/TileTransition";
import {
  DEFAULT_CURTAIN,
  isCurtainName,
  type CurtainName,
} from "../gsap/curtains";
import { useNeonPanelTransition } from "../gsap/NeonPanelTransition";

const PageTransitionCtx = createContext<{
  push: (href: string) => void;
  playing: boolean;
} | null>(null);

export function usePageTransition() {
  const ctx = useContext(PageTransitionCtx);
  if (!ctx) throw new Error("usePageTransition must be used within PageTransitionProvider");
  return ctx;
}

const SKILLS_PAGE_PATH = "/skills";

function pathOf(href: string): string {
  try {
    return new URL(href, "http://localhost").pathname;
  } catch {
    return href.split("?")[0];
  }
}

function isSkillsPage(href: string): boolean {
  return pathOf(href) === SKILLS_PAGE_PATH;
}

/**
 * 遷移先ごとのタイルの色。サイト内で既に使っているアクセント3色
 * （Contact の順次点灯や Projects のタイトルと同じ）に対応させている。
 *
 * tile   … タイルの地色。色として認識できる濃さで塗る
 * accent … 縁の発光と LOADING のグローに使う明るいほう
 *
 * LOADING の文字色は白固定。地色を濃くしたぶん、同系色のアクセントを文字に使うと
 * コントラストが足りなくなるため。
 */
const THEMES: Record<string, TransitionTheme> = {
  "/project/about": { tile: "#1f9082", accent: "#2ccdb9" }, // シアン
  "/project/works": { tile: "#6140b3", accent: "#8a5cff" }, // パープル
  "/project/contact": { tile: "#b37d36", accent: "#ffb34d" }, // アンバー
  "/": { tile: "#2b313a", accent: "#c9d1d9" }, // トップは無彩色
};
const FALLBACK_THEME: TransitionTheme = { tile: "#2b313a", accent: "#c9d1d9" };

const themeFor = (href: string): TransitionTheme =>
  THEMES[pathOf(href)] ?? FALLBACK_THEME;

export function PageTransitionProvider({
  children,
  tileGap = 0,
  accentMint = "#11a98b",
  accentPurple = "#5a37a6",
  panelDuration = 0.9,
  panelPushAt = 0.4,
}: {
  children: React.ReactNode;
  tileGap?: number;
  accentMint?: string;
  accentPurple?: string;
  // タイルの色は遷移先ごとに THEMES から決まる。尺は TileTransition 側の定数で固定
  panelDuration?: number;
  panelPushAt?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [playing, setPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  // 採用しているのは grid。louver / glitch は残してあるので、
  // ?pt=louver のように URL で切り替えて見比べられる
  const [curtain, setCurtain] = useState<CurtainName>(DEFAULT_CURTAIN);

  useEffect(() => {
    setMounted(true);

    // URL の ?pt=louver が最優先。一度指定したら localStorage に残るので、
    // 以降は普通にリンクを辿るだけで同じ見せ方が続く。?pt=off で解除
    const fromUrl = new URLSearchParams(window.location.search).get("pt");
    if (fromUrl === "off") {
      localStorage.removeItem("pt:style");
      setCurtain(DEFAULT_CURTAIN);
      return;
    }
    if (isCurtainName(fromUrl)) {
      localStorage.setItem("pt:style", fromUrl);
      setCurtain(fromUrl);
      return;
    }

    const saved = localStorage.getItem("pt:style");
    if (isCurtainName(saved)) setCurtain(saved);
  }, []);

  const tile = useTileTransition({
    router,
    setPlaying,
    curtain,
    tileGap,
  });

  const neon = useNeonPanelTransition({
    router,
    mounted,
    setPlaying,
    accentMint,
    accentPurple,
    duration: panelDuration,
    pushAt: panelPushAt,
  });

  const push = async (href: string) => {
    if (isSkillsPage(href)) {
      await neon.runOut(href);
    } else {
      // 戻り側でも同じ色で剥がすため、遷移先のパスを覚えておく
      sessionStorage.setItem("pt:theme", pathOf(href));
      await tile.runOut(href, themeFor(href));
    }
  };

  // tile / neon はフックが毎レンダー新しいオブジェクトを返すので、依存配列に
  // 入れるとレンダーのたびに再実行されて runIn が二重に走りうる。
  // 「遷移直後に1回だけ」を保つため、最新値は ref から読む
  const transitionsRef = useRef({ tile, neon });
  useEffect(() => {
    transitionsRef.current = { tile, neon };
  });

  useEffect(() => {
    if (!mounted || sessionStorage.getItem("pt:pending") !== "1") return;

    const variant = sessionStorage.getItem("pt:variant");
    const themePath = sessionStorage.getItem("pt:theme");
    sessionStorage.removeItem("pt:pending");
    sessionStorage.removeItem("pt:pushed");
    sessionStorage.removeItem("pt:variant");
    sessionStorage.removeItem("pt:theme");

    if (variant === "neon") {
      transitionsRef.current.neon.runIn();
    } else if (variant === "tile") {
      transitionsRef.current.tile.runIn(themeFor(themePath ?? ""));
    } else {
      setPlaying(false);
    }
  }, [pathname, mounted]);

  const tileOverlayEl = mounted && typeof document !== "undefined" && (
    <div
      ref={tile.overlayRef}
      className="fixed inset-0 opacity-0 pointer-events-none"
      aria-hidden="true"
      style={{
        zIndex: 2147483647,
        willChange: "opacity",
        backgroundColor: "transparent",
      }}
    >
      <div
        ref={tile.gridRef}
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${tile.cols}, 1fr)`,
          gridTemplateRows: `repeat(${tile.rows}, 1fr)`,
          gap: tile.tileGap,
          // louver の rotateY に奥行きを出す。他の見せ方では効かない
          perspective: 1200,
        }}
      >
        {Array.from({ length: tile.totalTiles }, (_, i) => (
          <div
            key={`${tile.curtain}-${i}`}
            ref={(el) => {
              if (el) tile.tilesRef.current[i] = el;
            }}
            className="w-full h-full"
            // 実際の色は runOut / runIn が遷移先のテーマで塗り直す。
            // ここは初回描画までの保険なので既定色を置いておく
            style={{
              backgroundColor: tile.defaultTheme.tile,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "rgba(255,255,255,0.06)",
              opacity: 0,
            }}
            aria-hidden
          />
        ))}
      </div>
      <div
        ref={tile.loadingRef}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: 0, visibility: "hidden" as const }}
      >
        <span
          className="tracking-[0.2em] select-none font-semibold"
          style={{
            fontSize: "min(8vw, 36px)",
            color: tile.defaultTheme.accent,
            letterSpacing: "0.2em",
          }}
        >
          LOADING
        </span>
      </div>
    </div>
  );

  const neonOverlayEl = mounted && (
    <div
      ref={neon.layerRef}
      className="fixed inset-0 z-[2147483646] pointer-events-none opacity-0"
      aria-hidden="true"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          ref={neon.mintRef}
          className="absolute -left-1/3 -top-1/3 h-[160vh] w-[160vw] rounded-[8px]"
          style={{
            background: `linear-gradient(135deg, ${neon.accentMint}, ${neon.accentMint})`,
            clipPath: "polygon(0% 10%, 86% 0%, 100% 90%, 12% 100%)",
          }}
        />
        <div
          ref={neon.purpleRef}
          className="absolute -left-1/4 -top-1/4 h-[160vh] w-[160vw] rounded-[8px]"
          style={{
            background: `linear-gradient(135deg, ${neon.accentPurple}, ${neon.accentPurple})`,
            clipPath: "polygon(8% 0%, 100% 12%, 92% 100%, 0% 88%)",
          }}
        />
      </div>
    </div>
  );

  return (
    <PageTransitionCtx.Provider value={{ push, playing }}>
      {children}
      {tileOverlayEl && createPortal(tileOverlayEl, document.body)}
      {neonOverlayEl && createPortal(neonOverlayEl, document.body)}
    </PageTransitionCtx.Provider>
  );
}

export function TransitionLink({
  href,
  children,
  className = "",
  onClick: onCustomClick,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const { push, playing } = usePageTransition();

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (!playing) push(href);
    onCustomClick?.(e);
  };

  return (
    <a href={href} onClick={onClick} className={className} aria-disabled={playing ? true : undefined}>
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
