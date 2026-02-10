/**
 * TileTransition
 *
 * 正方形タイルが画面上から順に出現してページを覆う遷移演出
 * 通常のページ遷移で使用
 */
"use client";

import React, {
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";

const COLS = 8;
const ROWS = 14;
const TILE_IN_DURATION = 0.6;
const TILE_OUT_DURATION = 0.5;
const STAGGER_IN = 0.018;
const STAGGER_OUT = 0.012;
const LOADING_MIN_MS = 400;

export function useTileTransition({
  router,
  mounted,
  setPlaying,
  cols = COLS,
  rows = ROWS,
  tileColor = "#5a37a6",
  tileGap = 0,
  accentColor = "#5a37a6",
}: {
  router: ReturnType<typeof import("next/navigation").useRouter>;
  mounted: boolean;
  setPlaying: (v: boolean) => void;
  cols?: number;
  rows?: number;
  tileColor?: string;
  tileGap?: number;
  accentColor?: string;
}) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const tilesRef = useRef<HTMLDivElement[]>([]);
  const loadingRef = useRef<HTMLDivElement | null>(null);

  const totalTiles = cols * rows;

  const prefersReduced = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const runOut = useCallback(
    async (href: string) => {
      if (prefersReduced || !overlayRef.current || !gridRef.current) {
        router.push(href);
        return;
      }

      const tiles = tilesRef.current.filter(Boolean);
      if (tiles.length === 0) {
        router.push(href);
        return;
      }

      sessionStorage.setItem("pt:pending", "1");
      sessionStorage.setItem("pt:variant", "tile");
      setPlaying(true);

      gsap.set(overlayRef.current, { opacity: 1, pointerEvents: "auto" });
      gsap.set(loadingRef.current, { opacity: 0, visibility: "hidden" });
      gsap.set(tiles, { y: "-100%", opacity: 0, clearProps: "none" });

      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(loadingRef.current, { opacity: 1, visibility: "visible" });
          sessionStorage.setItem("pt:pushed", "1");
          router.push(href);
        },
      });

      tl.to(tiles, {
        y: "0%",
        opacity: 1,
        duration: TILE_IN_DURATION,
        stagger: { each: STAGGER_IN, from: "start", grid: [cols, rows] },
        ease: "power2.out",
      });
    },
    [router, prefersReduced, setPlaying, cols, rows]
  );

  const runIn = useCallback(async () => {
    const tiles = tilesRef.current.filter(Boolean);
    if (tiles.length === 0) {
      setPlaying(false);
      gsap.set(overlayRef.current, { opacity: 0, pointerEvents: "none" });
      return;
    }

    await new Promise((r) => setTimeout(r, LOADING_MIN_MS));

    gsap.set(tiles, { y: "0%", opacity: 1 });
    gsap.set(loadingRef.current, { opacity: 0, visibility: "hidden" });

    const tl = gsap.timeline({
      onComplete: () => {
        setPlaying(false);
        gsap.set(overlayRef.current, { opacity: 0, pointerEvents: "none" });
      },
    });

    tl.to(tiles, {
      y: "100%",
      opacity: 0,
      duration: TILE_OUT_DURATION,
      stagger: { each: STAGGER_OUT, from: "end", grid: [cols, rows] },
      ease: "power2.in",
    });
  }, [setPlaying, cols, rows]);

  useLayoutEffect(() => {
    tilesRef.current = [];
  }, []);

  return {
    overlayRef,
    gridRef,
    tilesRef,
    loadingRef,
    totalTiles,
    runOut,
    runIn,
    tileColor,
    tileGap,
    accentColor,
    cols,
    rows,
  };
}
