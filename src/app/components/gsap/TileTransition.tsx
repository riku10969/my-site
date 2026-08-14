/**
 * TileTransition
 *
 * ページを覆う遷移演出の骨組み。`/skills` 以外の通常のページ遷移で使う。
 *
 * ここが持つのは全ての見せ方に共通する部分だけ:
 *   - オーバーレイと格子の ref
 *   - 遷移先ごとの色（TransitionTheme）の塗り分け
 *   - どのタイミングで router.push するか
 *   - LOADING の表示
 *
 * 「どう動くか」は `curtains/` に分けてある（grid / louver / glitch）。
 * 採用しているのは grid。試したいときは URL に ?pt=louver などを付ける。
 */
"use client";

import { useMemo, useRef, useCallback } from "react";
import gsap from "gsap";
import { CURTAINS, DEFAULT_CURTAIN, type CurtainName } from "./curtains";

export type TransitionTheme = {
  /** タイルの地色。色として認識できる濃さで塗る */
  tile: string;
  /** 縁の発光と LOADING のグローに使う明るいほう */
  accent: string;
};

/** タイルの縁に出すアクセントの濃さ。格子がネオンの枠に見えるくらい */
const EDGE_ALPHA = 0.55;

/**
 * 覆う動きが何割進んだら遷移を始めるか。
 * 完走を待つと 0.2 秒ほど無駄になるので、ほぼ覆えた時点で走らせる。
 */
const PUSH_AT = 0.75;
/** 遷移先の描画が早すぎたときに LOADING を一瞬だけ見せるための最低待ち */
const LOADING_MIN_MS = 200;

const DEFAULT_THEME: TransitionTheme = { tile: "#2b313a", accent: "#c9d1d9" };

/** 見せ方ごとの固有スタイルを消すときの既定値。tileVars と対で使う */
const TILE_VARS_RESET: gsap.TweenVars = { boxShadow: "none" };

/** #rrggbb → rgba(r,g,b,a)。タイルの縁を光らせるのに使う */
function withAlpha(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const v = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${alpha})`;
}

// NeonPanelTransition と違い mounted は不要（マウント後にしか呼ばれない
// runOut / runIn の中でしか DOM を触らないため）
export function useTileTransition({
  router,
  setPlaying,
  curtain = DEFAULT_CURTAIN,
  tileGap = 0,
}: {
  router: ReturnType<typeof import("next/navigation").useRouter>;
  setPlaying: (v: boolean) => void;
  curtain?: CurtainName;
  tileGap?: number;
}) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const tilesRef = useRef<HTMLDivElement[]>([]);
  const loadingRef = useRef<HTMLDivElement | null>(null);

  const spec = CURTAINS[curtain];
  const { cols, rows } = spec.layout;
  const totalTiles = cols * rows;

  const prefersReduced = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  /**
   * 今の分割数ぶんだけ、かつまだ DOM にある要素を取り出す。
   * 見せ方を切り替えると分割数が変わり、配列の後ろに前の見せ方の
   * 外れた要素が残るので、ここで必ず絞る
   */
  const collectTiles = useCallback(
    () => tilesRef.current.slice(0, totalTiles).filter((el) => el?.isConnected),
    [totalTiles]
  );

  /** タイルと LOADING を遷移先の色で塗り直す */
  const paint = useCallback(
    (tiles: HTMLDivElement[], theme: TransitionTheme) => {
      gsap.set(tiles, {
        backgroundColor: theme.tile,
        borderColor: withAlpha(theme.accent, EDGE_ALPHA),
        // 前の見せ方の固有スタイルが残らないよう、まず既定に戻してから乗せる
        ...TILE_VARS_RESET,
        ...spec.tileVars,
      });
      if (loadingRef.current) {
        // 地色が濃いので文字は白。光り方だけアクセントに寄せる
        gsap.set(loadingRef.current, {
          color: "#ffffff",
          textShadow: `0 0 10px ${theme.accent}, 0 0 28px ${withAlpha(theme.accent, 0.7)}`,
        });
      }
    },
    [spec]
  );

  const runOut = useCallback(
    async (href: string, theme: TransitionTheme = DEFAULT_THEME) => {
      if (prefersReduced || !overlayRef.current || !gridRef.current) {
        router.push(href);
        return;
      }

      const tiles = collectTiles();
      if (tiles.length === 0) {
        router.push(href);
        return;
      }

      sessionStorage.setItem("pt:pending", "1");
      sessionStorage.setItem("pt:variant", "tile");
      setPlaying(true);

      gsap.set(overlayRef.current, { opacity: 1, pointerEvents: "auto" });
      gsap.set(loadingRef.current, { opacity: 0, visibility: "hidden" });
      paint(tiles, theme);

      let pushed = false;
      const tl = gsap.timeline({
        onUpdate: () => {
          if (!pushed && tl.progress() >= PUSH_AT) {
            pushed = true;
            sessionStorage.setItem("pt:pushed", "1");
            router.push(href);
          }
        },
        onComplete: () => {
          gsap.set(loadingRef.current, { opacity: 1, visibility: "visible" });
        },
      });

      spec.cover(tl, tiles, spec.layout);
    },
    [router, prefersReduced, setPlaying, paint, collectTiles, spec]
  );

  const runIn = useCallback(
    async (theme: TransitionTheme = DEFAULT_THEME) => {
      const tiles = collectTiles();
      if (tiles.length === 0) {
        setPlaying(false);
        gsap.set(overlayRef.current, { opacity: 0, pointerEvents: "none" });
        return;
      }

      await new Promise((r) => setTimeout(r, LOADING_MIN_MS));

      paint(tiles, theme);
      gsap.set(loadingRef.current, { opacity: 0, visibility: "hidden" });

      const tl = gsap.timeline({
        onComplete: () => {
          setPlaying(false);
          gsap.set(overlayRef.current, { opacity: 0, pointerEvents: "none" });
        },
      });

      spec.uncover(tl, tiles, spec.layout);
    },
    [setPlaying, paint, collectTiles, spec]
  );

  return {
    overlayRef,
    gridRef,
    tilesRef,
    loadingRef,
    totalTiles,
    runOut,
    runIn,
    tileGap,
    cols,
    rows,
    curtain,
    defaultTheme: DEFAULT_THEME,
  };
}
