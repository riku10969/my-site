/**
 * NeonPanelTransition
 *
 * ミント・パープルのパネルがスライドする遷移演出
 * スキル詳細ページ（/skills）への遷移時のみ使用
 */
"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
} from "react";
import gsap from "gsap";

export function useNeonPanelTransition({
  router,
  mounted,
  setPlaying,
  accentMint = "#11a98b",
  accentPurple = "#5a37a6",
  duration = 0.9,
  pushAt = 0.4,
}: {
  router: ReturnType<typeof import("next/navigation").useRouter>;
  mounted: boolean;
  setPlaying: (v: boolean) => void;
  accentMint?: string;
  accentPurple?: string;
  duration?: number;
  pushAt?: number;
}) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const mintRef = useRef<HTMLDivElement | null>(null);
  const purpleRef = useRef<HTMLDivElement | null>(null);

  const prefersReduced = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useLayoutEffect(() => {
    if (!mounted || !layerRef.current) return;
    gsap.set(layerRef.current, { opacity: 0, pointerEvents: "none" });
    if (!mintRef.current || !purpleRef.current) return;
    gsap.set([mintRef.current, purpleRef.current], {
      yPercent: 120,
      xPercent: -40,
      rotation: 3,
      transformOrigin: "50% 50%",
    });
  }, [mounted]);

  const runOut = useCallback(
    async (href: string) => {
      if (prefersReduced || !layerRef.current || !mintRef.current || !purpleRef.current) {
        router.push(href);
        return;
      }

      sessionStorage.setItem("pt:pending", "1");
      sessionStorage.setItem("pt:variant", "neon");
      setPlaying(true);

      gsap.set(layerRef.current, { opacity: 1, pointerEvents: "auto", willChange: "transform, opacity" });
      gsap.set(mintRef.current, { yPercent: 120, xPercent: -40, rotation: 3, zIndex: 2, willChange: "transform" });
      gsap.set(purpleRef.current, { yPercent: 120, xPercent: -40, rotation: 3, zIndex: 1, willChange: "transform" });

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
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
    },
    [router, prefersReduced, setPlaying, duration, pushAt]
  );

  const runIn = useCallback(() => {
    if (!mounted || !layerRef.current || !mintRef.current || !purpleRef.current) return;

    gsap.killTweensOf([mintRef.current, purpleRef.current, layerRef.current]);

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
      .to(layerRef.current!, { opacity: 0, duration: 0.3, ease: "power1.out" }, "-=0.2");
  }, [mounted, setPlaying, duration]);

  return { layerRef, mintRef, purpleRef, runOut, runIn, accentMint, accentPurple };
}
