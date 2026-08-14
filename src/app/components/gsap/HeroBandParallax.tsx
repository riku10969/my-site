/**
 * HeroBandParallax
 *
 * 全幅の帯に敷いた写真を、スクロールに合わせてゆっくり持ち上げる。
 * `sections/AboutSection` のヒーローから呼ばれる。
 *
 * 呼び出し側のマークアップに前提が 2 つある。
 *
 *  1. 写真は帯より縦に大きく（例: h-[120%]）、少し上にずらして置くこと。
 *     持ち上げたときに下端に隙間ができないようにするため。
 *  2. その「少し上にずらす」は transform ではなく top で書くこと。
 *     GSAP が transform を専有するので、両方 transform だと打ち消される。
 *
 * 動く量は帯の高さに対する割合（yPercent）なので、帯の高さが
 * ブレークポイントで変わっても比率は保たれる。
 */
"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * 持ち上げる量（写真自身の高さに対する %）。
 * 写真が帯の 120% の高さなら、帯に対しては 13.2% 動く。
 */
const LIFT_PERCENT = -11;

export function useHeroBandParallax({
  bandRef,
  imageRef,
}: {
  /** 帯（overflow: hidden の枠）。スクロール量の基準にする */
  bandRef: React.RefObject<HTMLElement | null>;
  /** 帯の中で動かす写真のラッパー */
  imageRef: React.RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    const band = bandRef.current;
    const image = imageRef.current;
    if (!band || !image) return;

    const mm = gsap.matchMedia();

    // 動きを減らす設定では何も作らない（条件が match しなければコールバックは走らない）
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        image,
        { yPercent: 0 },
        {
          yPercent: LIFT_PERCENT,
          ease: "none",
          scrollTrigger: {
            trigger: band,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
            invalidateOnRefresh: true,
          },
        }
      );
    });

    return () => mm.revert();
  }, [bandRef, imageRef]);
}
