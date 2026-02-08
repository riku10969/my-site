/**
 * PageTransition
 *
 * ページ遷移の演出を統一管理
 * - 通常: タイルが覆う演出（TileTransition）
 * - /skills への遷移時のみ: ミント・パープルパネル演出（NeonPanelTransition）
 */
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useTileTransition } from "./TileTransition";
import { useNeonPanelTransition } from "./NeonPanelTransition";

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

function isSkillsPage(href: string): boolean {
  try {
    const u = new URL(href, "http://localhost");
    return u.pathname === SKILLS_PAGE_PATH;
  } catch {
    return href === SKILLS_PAGE_PATH || href.startsWith(`${SKILLS_PAGE_PATH}?`);
  }
}

export function PageTransitionProvider({
  children,
  tileColor = "#0f1214",
  tileGap = 0,
  accentColor = "#11a98b",
  accentMint = "#11a98b",
  accentPurple = "#5a37a6",
  tileDuration = 0.6,
  panelDuration = 0.9,
  panelPushAt = 0.4,
}: {
  children: React.ReactNode;
  tileColor?: string;
  tileGap?: number;
  accentColor?: string;
  accentMint?: string;
  accentPurple?: string;
  tileDuration?: number;
  panelDuration?: number;
  panelPushAt?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [playing, setPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const tile = useTileTransition({
    router,
    mounted,
    setPlaying,
    tileColor,
    tileGap,
    accentColor,
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
      await tile.runOut(href);
    }
  };

  useEffect(() => {
    if (!mounted || sessionStorage.getItem("pt:pending") !== "1") return;

    const variant = sessionStorage.getItem("pt:variant");
    sessionStorage.removeItem("pt:pending");
    sessionStorage.removeItem("pt:pushed");
    sessionStorage.removeItem("pt:variant");

    if (variant === "neon") {
      neon.runIn();
    } else if (variant === "tile") {
      tile.runIn();
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
        }}
      >
        {Array.from({ length: tile.totalTiles }, (_, i) => (
          <div
            key={i}
            ref={(el) => {
              if (el) tile.tilesRef.current[i] = el;
            }}
            className="w-full h-full"
            style={{
              backgroundColor: tile.tileColor,
              border: "1px solid rgba(255,255,255,0.06)",
              transform: "translateY(-100%)",
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
            color: tile.accentColor,
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
