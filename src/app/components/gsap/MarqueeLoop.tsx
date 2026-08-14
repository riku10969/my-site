/**
 * MarqueeLoop
 *
 * 横方向の無限ループスクロール。`ui/InfiniteMarquee.tsx` から呼ばれる。
 * トラックは 1 周分の内容を 2 回並べている前提で、x を [-loopWidth, 0) に
 * wrap し続ける（1 周ぶん動かすと同じ絵になるので継ぎ目が出ない）。
 *
 * 旧実装から直したもの:
 * - デスクトップは CSS keyframes、モバイルは自前 rAF の二重実装だった → 1 本に統合
 * - 自前 rAF が `pxPerSec / 60` とフレームレートを前提にしていたため、
 *   120Hz の端末では 2 倍速で流れていた → GSAP が経過時間で進めるので解消
 * - 画面外でもループが回り続けていた → ScrollTrigger の onToggle で停止
 * - 動きを減らす設定への対応が無かった → 自動スクロールを作らない
 *   （呼び出し側は `reducedMotion` を見て横スクロール可能にする）
 */
"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useMarqueeLoop({
  hostRef,
  loopWidth,
  duration,
  direction = "left",
  pauseOnHover = false,
  draggable = false,
}: {
  /** 画面内判定に使う外枠。トラックの親 */
  hostRef: React.RefObject<HTMLElement | null>;
  /** 1 周の移動距離(px)。トラックはこの 2 倍の幅を持つ前提 */
  loopWidth: number;
  /** 1 周にかける秒数 */
  duration: number;
  direction?: "left" | "right";
  /** ホバー中は止める（ポインタがある環境向け） */
  pauseOnHover?: boolean;
  /** タッチでドラッグして動かせるようにする（モバイル向け） */
  draggable?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const host = hostRef.current;
    if (!track || !host || loopWidth <= 0 || duration <= 0) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // 表示位置 = wrap(自動スクロール量 + ドラッグ量)。
      // ドラッグは別に持つので、止めて指で動かしたあとも自動スクロールが続きから戻る
      const auto = { offset: 0 };
      let drag = 0;
      const wrap = gsap.utils.wrap(-loopWidth, 0);
      const render = () => {
        gsap.set(track, { x: wrap(auto.offset + drag) });
      };

      const tween = gsap.to(auto, {
        offset: direction === "left" ? -loopWidth : loopWidth,
        duration,
        ease: "none",
        repeat: -1,
        onUpdate: render,
      });

      render();

      // 一時停止の理由は同時に複数立ちうる（画面外 + ホバー など）。
      // ひとつでも残っている間は止め続ける
      const pausedBy = new Set<string>();
      const setPaused = (reason: string, on: boolean) => {
        if (on) pausedBy.add(reason);
        else pausedBy.delete(reason);
        if (pausedBy.size) tween.pause();
        else tween.play();
      };

      const cleanups: (() => void)[] = [];

      const st = ScrollTrigger.create({
        trigger: host,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => setPaused("offscreen", !self.isActive),
      });
      // 最初から画面外なら onToggle は呼ばれないので、初期状態を自分で反映する
      setPaused("offscreen", !st.isActive);
      cleanups.push(() => st.kill());

      if (pauseOnHover) {
        const enter = () => setPaused("hover", true);
        const leave = () => setPaused("hover", false);
        track.addEventListener("mouseenter", enter);
        track.addEventListener("mouseleave", leave);
        cleanups.push(() => {
          track.removeEventListener("mouseenter", enter);
          track.removeEventListener("mouseleave", leave);
        });
      }

      if (draggable) {
        let startX = 0;
        let startDrag = 0;
        let touching = false;

        const onStart = (e: TouchEvent) => {
          touching = true;
          startX = e.touches[0].clientX;
          startDrag = drag;
          setPaused("touch", true);
        };
        const onMove = (e: TouchEvent) => {
          if (!touching) return;
          // 横に動かしている間はページの縦スクロールに取られないようにする
          e.preventDefault();
          drag = startDrag - (startX - e.touches[0].clientX);
          render();
        };
        const onEnd = () => {
          touching = false;
          setPaused("touch", false);
        };

        // touchmove は preventDefault のため passive: false で登録する必要がある
        track.addEventListener("touchstart", onStart, { passive: true });
        track.addEventListener("touchmove", onMove, { passive: false });
        track.addEventListener("touchend", onEnd);
        track.addEventListener("touchcancel", onEnd);
        cleanups.push(() => {
          track.removeEventListener("touchstart", onStart);
          track.removeEventListener("touchmove", onMove);
          track.removeEventListener("touchend", onEnd);
          track.removeEventListener("touchcancel", onEnd);
        });
      }

      return () => cleanups.forEach((fn) => fn());
    });

    return () => mm.revert();
  }, [hostRef, loopWidth, duration, direction, pauseOnHover, draggable]);

  return { trackRef, reducedMotion };
}
