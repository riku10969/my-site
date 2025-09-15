"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { useMemo } from "react";

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
    height: number;       // ← 追加
    radius: number;
    onClick?: () => void;
  }) => React.ReactNode;
};


export default function InfiniteMarquee({
  images,
  direction = "left",
  speed = 22,
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
  useEffect(() => {
    let alive = true;
    Promise.all(
      Array.from(new Set(images)).map(
        (src) =>
          new Promise<number>((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve(img.naturalHeight / Math.max(1, img.naturalWidth));
            img.onerror = () => resolve(1);
            img.src = src;
          })
      )
    ).then((ratios) => {
      if (!alive) return;
      const m = Math.max(1, ...ratios); // たとえば縦長が混ざってたらここが最大
      setMaxAspect(m);
    });
    return () => {
      alive = false;
    };
  }, [images]);

  const itemHeight = Math.round(itemWidth * maxAspect);

  const baseSet = Array.from({ length: repeat }).flatMap(() => images);
  const doubled = [...baseSet, ...baseSet];
  
  useLayoutEffect(() => {
  const el = hostRef.current;
  if (!el) return;

  const ro = new ResizeObserver(() => {
    const containerW = el.clientWidth;

    // 1カードの占有幅（カード幅 + ギャップ）
    const unit = itemWidth + gap;

    // ベース配列1周の幅（最後の要素の右にも“ループ用”に gap を確保しておくと継ぎ目が滑らか）
    const baseW = images.length * unit;

    // 少し余裕を見て +unit しておくと「帯」が出にくい
    const minRepeats = Math.max(2, Math.ceil((containerW + unit) / baseW));
    setRepeat(minRepeats);
  });
  ro.observe(el);
  return () => ro.disconnect();
}, [images.length, itemWidth, gap]);

  return (
    <div
      ref={hostRef}
      className="relative w-full overflow-hidden"
      style={{ ["--gap" as any]: `${gap}px` }}
    >
      <div
        className={`flex items-center will-change-transform whitespace-nowrap
          ${direction === "left" ? "animate-marquee-left" : "animate-marquee-right"}`}
        style={{ ["--duration" as any]: `${speed}s` } as React.CSSProperties}
      >
        {doubled.map((src, i) => {
        const origLen   = images.length;
        const baseIndex = i % origLen;                 // ← 元配列で正規化
        const onClick   = () => onItemClick?.(baseIndex, src);

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
                renderItem({ index: baseIndex, src, width: itemWidth, height: itemHeight, radius, onClick })
              ) : (
                // デフォルト表示（枠だけ）
                <button type="button" onClick={onClick} className="block w-full">
                  <div
                    className="relative bg-[#121212] rounded-2xl"
                    style={{ width: itemWidth, height: itemHeight, borderRadius: radius }}
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
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-left  { animation: marquee-left  var(--duration, 22s) linear infinite; }
        .animate-marquee-right { animation: marquee-right var(--duration, 22s) linear infinite; }
      `}</style>
    </div>
  );
}
