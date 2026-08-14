/**
 * WatermarkParallax
 *
 * フッターの透かし文字をスクロールに合わせてじわっと浮かび上がらせる。
 * `ui/Footer.tsx` から呼ばれる。
 *
 * 対象要素に CSS 変数 `--wm-y` / `--wm-o` を書き込むだけで、見た目は
 * globals.css の `.watermark` 側が持っている（`transform: translateY(var(--wm-y))`
 * / `opacity: var(--wm-o)`）。
 *
 * start / end は元の自前実装の式をそのまま写したもの：
 *   p = clamp((vh - rect.top) / rect.height, 0, 1)
 *   → p=0 は要素の上端がビューポート下端 = "top bottom"
 *   → p=1 は要素の下端がビューポート下端 = "bottom bottom"
 */
"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** --wm-y の移動量（px）。24px 下から -6px まで持ち上げる */
const FROM_Y = "24px";
const TO_Y = "-6px";
/** --wm-o の不透明度 */
const FROM_OPACITY = 0;
const TO_OPACITY = 0.28;

export function useWatermarkParallax(
  targetRef: React.RefObject<HTMLElement | null>
) {
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    // 動きを減らす設定では何も作らない（条件が match しなければコールバックは走らない）。
    // 変数が未設定のままになるので .watermark 側の既定値（24px / 0）が効く
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        el,
        { "--wm-y": FROM_Y, "--wm-o": FROM_OPACITY },
        {
          "--wm-y": TO_Y,
          "--wm-o": TO_OPACITY,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom bottom",
            scrub: true,
          },
        }
      );
    });

    return () => mm.revert();
  }, [targetRef]);
}
