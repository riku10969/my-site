"use client";

import { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";

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
  const [repeat, setRepeat] = useState(1);
  const [maxAspect, setMaxAspect] = useState(1); // height / width

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
  const baseSet = Array.from({ length: repeat }).flatMap(() => images);
  const doubled = [...baseSet, ...baseSet];

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

  // ─────────────────────────────
  // ループ距離を px で固定
  // ─────────────────────────────
  const unit = itemWidth + gap;
  const baseLen = baseSet.length;
  const loopW = baseLen * unit;

  return (
    <div
      ref={hostRef}
      className="relative w-full overflow-hidden"
      style={{ ["--gap" as any]: `${gap}px` }}
    >
      <div
        className={`flex items-center will-change-transform whitespace-nowrap ${
          direction === "left"
            ? "animate-marquee-left"
            : "animate-marquee-right"
        } ${pauseOnHover ? "hover:[animation-play-state:paused]" : ""}`}
        style={
          {
            ["--duration" as any]: `${speed}s`,
            ["--loopW" as any]: `${loopW}px`,
          } as React.CSSProperties
        }
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

      <style jsx global>{`
        @keyframes marquee-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(var(--loopW) * -1));
          }
        }
        @keyframes marquee-right {
          0% {
            transform: translateX(calc(var(--loopW) * -1));
          }
          100% {
            transform: translateX(0);
          }
        }
        .animate-marquee-left {
          animation: marquee-left var(--duration, 22s) linear infinite;
        }
        .animate-marquee-right {
          animation: marquee-right var(--duration, 22s) linear infinite;
        }
      `}</style>
    </div>
  );
}
