"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";

type Dir = "left" | "right";

type Props = {
  images: string[];
  direction?: Dir;
  /** 1周にかかる秒数（小さいほど速い） */
  speed?: number;
  /** 各カードの幅(px)。レスポンシブで変えたい時はbreakpoint別にコンポを分けるか、CSSで調整してOK */
  itemWidth?: number;
  /** カード間の隙間(px) */
  gap?: number;
  /** ホバーで一時停止（PC向け） */
  pauseOnHover?: boolean;
  /** 角丸 */
  radius?: number;
};

export default function InfiniteMarquee({
  images,
  direction = "left",
  speed = 22,
  itemWidth = 220,
  gap = 16,
  pauseOnHover = true,
  radius = 12,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [repeat, setRepeat] = useState(1); // “画面幅を超えるまで”の繰り返し回数

  // ── 1) 画面幅に応じて「ベースセットの繰り返し回数」を計算
  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const containerW = el.clientWidth;
      // 画像N枚 + (N-1) * ギャップの合計
      const baseW = images.length * itemWidth + (images.length - 1) * gap;
      // ベースを何回繰り返せば “最低でも画面幅” を超えるか
      const minRepeats = Math.max(1, Math.ceil(containerW / baseW));
      setRepeat(minRepeats);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [images.length, itemWidth, gap]);

  // ── 2) ベースセット（画面幅を満たすまで複製）
  const baseSet = Array.from({ length: repeat })
    .flatMap(() => images);

  // ── 3) ベースセットを2回並べて無限ループ（-50%の移動で継ぎ目ゼロ）
  const doubled = [...baseSet, ...baseSet];

  return (
    <div
      ref={hostRef}
      className={`relative w-full overflow-hidden ${pauseOnHover ? "group" : ""}`}
      style={{ ["--gap" as any]: `${gap}px` }}
    >
      <div
        className={`flex items-center will-change-transform whitespace-nowrap
          ${direction === "left" ? "animate-marquee-left" : "animate-marquee-right"}
          ${pauseOnHover ? "group-hover:[animation-play-state:paused]" : ""}
        `}
        style={
          {
            ["--duration" as any]: `${speed}s`,
          } as React.CSSProperties
        }
      >
        {doubled.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="shrink-0"
            style={{ width: itemWidth, marginRight: i === doubled.length - 1 ? 0 : `var(--gap)` }}
          >
            <Image
              src={src}
              alt=""
              width={itemWidth}
              height={itemWidth}
              className="block"
              style={{ borderRadius: radius }}
              loading="lazy"
              draggable={false}
              decoding="async"
            />
          </div>
        ))}
      </div>

      {/* keyframes とユーティリティ */}
      <style jsx global>{`
        @keyframes marquee-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-left  { animation: marquee-left  var(--duration, 22s) linear infinite; }
        .animate-marquee-right { animation: marquee-right var(--duration, 22s) linear infinite; }
      `}</style>
    </div>
  );
}
