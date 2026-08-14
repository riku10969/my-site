"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { useMarqueeLoop } from "../gsap/MarqueeLoop";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const fn = () => setMobile(mql.matches);
    fn();
    mql.addEventListener("change", fn);
    return () => mql.removeEventListener("change", fn);
  }, []);
  return mobile;
}

type Props = {
  images: string[];
  direction?: "left" | "right";
  speed?: number;
  itemWidth?: number;
  gap?: number;
  pauseOnHover?: boolean;
  radius?: number;
  onItemClick?: (index: number, src: string) => void;
  renderItem?: (opts: {
    index: number;
    src: string;
    width: number;
    height: number;
    radius: number;
    onClick?: () => void;
  }) => React.ReactNode;
};

export default function InfiniteMarquee({
  images,
  direction = "left",
  speed = 40,
  itemWidth = 220,
  gap = 16,
  pauseOnHover = true,
  radius = 12,
  onItemClick,
  renderItem,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();
  const [repeat, setRepeat] = useState(1);
  const [maxAspect, setMaxAspect] = useState(1); // height / width

  const baseSetForLoop = Array.from({ length: repeat }).flatMap(() => images);
  const unitLocal = itemWidth + gap;
  const baseLenLocal = baseSetForLoop.length;
  const loopWLocal = baseLenLocal * unitLocal;

  // ループ本体は gsap/ に委譲。ホバー停止はポインタがある環境だけ、
  // ドラッグはモバイルだけ（旧実装の出し分けをそのまま踏襲）
  const { trackRef, reducedMotion } = useMarqueeLoop({
    hostRef,
    loopWidth: loopWLocal,
    duration: speed,
    direction,
    pauseOnHover: pauseOnHover && !isMobile,
    draggable: isMobile,
  });

  // ─────────────────────────────
  // 画像の縦横比を計算して最大値を取得
  // ─────────────────────────────
  useEffect(() => {
    let alive = true;
    const uniq = Array.from(new Set(images));

    Promise.all(
      uniq.map(
        (src) =>
          new Promise<number>((resolve) => {
            const img = new window.Image();
            img.onload = () =>
              resolve(img.naturalHeight / Math.max(1, img.naturalWidth));
            img.onerror = () => resolve(1);
            img.src = src;
          })
      )
    ).then((ratios) => {
      if (!alive) return;
      const m = Math.max(1, ...ratios);
      setMaxAspect(m);
    });
    return () => {
      alive = false;
    };
  }, [images]);

  const itemHeight = Math.round(itemWidth * maxAspect);
  const doubled = [...baseSetForLoop, ...baseSetForLoop];

  // ─────────────────────────────
  // resize監視：repeatの更新を必要時だけ行う
  // ─────────────────────────────
  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const containerW = el.clientWidth;
        const unit = itemWidth + gap;
        const baseW = images.length * unit;

        // 少し余裕を見て +unit しておく
        const minRepeats = Math.max(2, Math.ceil((containerW + unit) / baseW));

        // 等値ガード：値が同じなら再setしない
        setRepeat((prev) => (prev === minRepeats ? prev : minRepeats));
      });
    });

    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [images.length, itemWidth, gap]);

  return (
    <div
      ref={hostRef}
      // 動きを減らす設定では自動スクロールしないので、代わりに横スクロールで
      // 全部見られるようにする（overflow-hidden のままだと最初の数枚しか届かない）
      className={`relative w-full ${reducedMotion ? "overflow-x-auto" : "overflow-hidden"}`}
      style={{ ["--gap" as string]: `${gap}px` } as React.CSSProperties}
    >
      <div
        ref={trackRef}
        className={`flex items-center whitespace-nowrap ${
          reducedMotion ? "" : "will-change-transform"
        } ${
          isMobile && !reducedMotion ? "touch-pan-y cursor-grab active:cursor-grabbing" : ""
        }`}
      >
        {doubled.map((src, i) => {
          const origLen = images.length;
          const baseIndex = i % origLen;
          const onClick = () => onItemClick?.(baseIndex, src);

          return (
            <div
              key={`${src}-${i}`}
              className="shrink-0"
              style={{
                width: itemWidth,
                marginRight: i === doubled.length - 1 ? 0 : `${gap}px`,
              }}
            >
              {renderItem ? (
                renderItem({
                  index: baseIndex,
                  src,
                  width: itemWidth,
                  height: itemHeight,
                  radius,
                  onClick,
                })
              ) : (
                <button
                  type="button"
                  onClick={onClick}
                  className="block w-full"
                >
                  <div
                    className="relative bg-[#121212] rounded-2xl"
                    style={{
                      width: itemWidth,
                      height: itemHeight,
                      borderRadius: radius,
                    }}
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes={`${itemWidth}px`}
                      style={{ objectFit: "contain", borderRadius: radius }}
                      loading="lazy"
                      draggable={false}
                      decoding="async"
                    />
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
