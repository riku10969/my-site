"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";

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
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();
  const [repeat, setRepeat] = useState(1);
  const [maxAspect, setMaxAspect] = useState(1); // height / width

  // モバイル：タッチでアニメーション停止＋ドラッグで左右スクロール
  const posRef = useRef(0);
  const touchStartXRef = useRef(0);
  const touchStartPosRef = useRef(0);
  const isTouchingRef = useRef(false);

  const baseSetForLoop = Array.from({ length: repeat }).flatMap(() => images);
  const unitLocal = itemWidth + gap;
  const baseLenLocal = baseSetForLoop.length;
  const loopWLocal = baseLenLocal * unitLocal;
  const pxPerSec = loopWLocal / speed;

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile) return;
      isTouchingRef.current = true;
      touchStartXRef.current = e.touches[0].clientX;
      touchStartPosRef.current = posRef.current;
    },
    [isMobile]
  );


  const handleTouchEnd = useCallback(() => {
    if (!isMobile) return;
    isTouchingRef.current = false;
  }, [isMobile]);

  // モバイル：touchmove を passive: false で登録（preventDefault を有効にする）
  useEffect(() => {
    if (!isMobile || !trackRef.current) return;
    const track = trackRef.current;
    const onMove = (e: TouchEvent) => {
      if (!isTouchingRef.current) return;
      e.preventDefault();
      const dx = touchStartXRef.current - e.touches[0].clientX;
      const raw = touchStartPosRef.current + dx;
      const wrapped = ((raw % loopWLocal) + loopWLocal) % loopWLocal;
      posRef.current = direction === "left" ? -wrapped : wrapped - loopWLocal;
      track.style.transform = `translateX(${posRef.current}px)`;
    };
    track.addEventListener("touchmove", onMove, { passive: false });
    return () => track.removeEventListener("touchmove", onMove);
  }, [isMobile, loopWLocal, direction]);

  // モバイル：JSでアニメーション＋タッチ中は一時停止
  useEffect(() => {
    if (!isMobile) return;
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (isTouchingRef.current) return;
      posRef.current -= (direction === "left" ? 1 : -1) * (pxPerSec / 60);
      if (direction === "left" && posRef.current < -loopWLocal) posRef.current += loopWLocal;
      if (direction === "left" && posRef.current > 0) posRef.current -= loopWLocal;
      if (direction === "right" && posRef.current > 0) posRef.current -= loopWLocal;
      if (direction === "right" && posRef.current < -loopWLocal) posRef.current += loopWLocal;
      track.style.transform = `translateX(${posRef.current}px)`;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isMobile, loopWLocal, direction, pxPerSec]);

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

  // ─────────────────────────────
  // ループ距離を px で固定
  // ─────────────────────────────
  return (
    <div
      ref={hostRef}
      className="relative w-full overflow-hidden"
      style={{ ["--gap" as any]: `${gap}px` }}
    >
      <div
        ref={trackRef}
        className={`flex items-center will-change-transform whitespace-nowrap ${
          isMobile
            ? "touch-pan-y cursor-grab active:cursor-grabbing"
            : `${direction === "left" ? "animate-marquee-left" : "animate-marquee-right"} ${pauseOnHover ? "hover:[animation-play-state:paused]" : ""}`
        }`}
        style={
          isMobile
            ? undefined
            : ({
                ["--duration" as any]: `${speed}s`,
                ["--loopW" as any]: `${loopWLocal}px`,
              } as React.CSSProperties)
        }
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
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
