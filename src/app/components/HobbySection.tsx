"use client";

import NextImage from "next/image";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import GlitchText from "./GlitchText";

/* =====================
   Tilt（3Dチルト）Hook（変更なし）
   ===================== */
type TiltOpts = { enabled?: boolean; maxTilt?: number; scale?: number };
function useTilt<T extends HTMLElement>({
  enabled = true,
  maxTilt = 12,
  scale = 1.02,
}: TiltOpts = {}) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const px = (x / rect.width) * 2 - 1; // -1 .. 1
      const py = (y / rect.height) * 2 - 1;
      const rx = (-py * maxTilt).toFixed(2);
      const ry = (px * maxTilt).toFixed(2);
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
      el.style.boxShadow = `0 18px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(44,205,185,0.20)`;
    };

    const handleLeave = () => {
      el.style.transform = `perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)`;
      el.style.boxShadow = `0 10px 30px rgba(0,0,0,0.40), 0 0 0 1px rgba(44,205,185,0.12)`;
    };

    const handleDown = () => { el.style.transition = "transform 80ms"; };
    const handleUp = () => { el.style.transition = "transform 240ms ease"; };

    el.style.transition = "transform 240ms ease, box-shadow 240ms ease";
    handleLeave();

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    el.addEventListener("mousedown", handleDown);
    el.addEventListener("mouseup", handleUp);

    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
      el.removeEventListener("mousedown", handleDown);
      el.removeEventListener("mouseup", handleUp);
    };
  }, [enabled, maxTilt, scale]);

  return ref;
}

/* ==================
   ZoomImageModal（正方形版に置換）
   ================== */

function computeSquareSide(vw: number, vh: number) {
  const SIDE_VW = 0.8;  // 横は 80vw まで
  const SIDE_VH = 0.4;  // 縦は 80vh まで
  const MAX = 1000;     // 上限 px（好みで調整）
  const MIN = 280;      // 下限 px（スマホで小さすぎ防止）
  const side = Math.min(vw * SIDE_VW, vh * SIDE_VH, MAX);
  return Math.max(MIN, Math.round(side));
}

function ZoomImageModal({
  open,
  item,
  originEl,
  onRequestClose,
}: {
  open: boolean;
  item: { src: string; alt: string; label?: string; description?: string } | null;
  originEl: HTMLElement | null;
  onRequestClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(false); // フレーム＆UIの可視
  const [box, setBox] = useState<number | null>(null); // 正方形の一辺
  const cloneRef = useRef<HTMLImageElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  const prefersNoMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => setMounted(true), []);

  // 一辺を算出（オープン時＆リサイズ時）
  useEffect(() => {
    if (!open) return;
    const recalc = () => {
      const { innerWidth: vw, innerHeight: vh } = window;
      setBox(computeSquareSide(vw, vh));
    };
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [open]);

  // Escで閉じる＋スクロール固定
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const { style } = document.documentElement;
    const prev = style.overflow;
    style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const playOpen = useCallback(async () => {
    if (!item || !originEl || box == null) return;
    const rect = originEl.getBoundingClientRect();
    const { innerWidth: vw, innerHeight: vh } = window;

    // 目標位置（中央の正方形）
    const targetW = box;
    const targetH = box;
    const targetX = Math.round((vw - targetW) / 2);
    const targetY = Math.round((vh - targetH) / 2);

    // クローン（遷移中だけ使用）
    const clone = document.createElement("img");
    clone.src = item.src;
    clone.alt = item.alt;
    Object.assign(clone.style, {
      position: "fixed",
      left: rect.left + "px",
      top: rect.top + "px",
      width: rect.width + "px",
      height: rect.height + "px",
      objectFit: "cover",
      borderRadius: getComputedStyle(originEl).borderRadius || "16px",
      boxShadow: "0 20px 60px rgba(0,0,0,.45)",
      willChange: "transform, width, height, left, top, opacity, border-radius",
      zIndex: "1000",
    } as CSSStyleDeclaration);
    cloneRef.current = clone;

    // バックドロップ
    const backdrop = document.createElement("div");
    Object.assign(backdrop.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0)",
      backdropFilter: "blur(0px)",
      transition: prefersNoMotion ? "none" : "background 240ms ease, backdrop-filter 240ms ease",
      zIndex: "900",
    } as CSSStyleDeclaration);
    backdropRef.current = backdrop;

    document.body.appendChild(backdrop);
    document.body.appendChild(clone);

    setAnimating(true);
    requestAnimationFrame(() => {
      if (!prefersNoMotion) {
        backdrop.style.background = "rgba(0,0,0,.70)";
        backdrop.style.backdropFilter = "blur(2px)";
      } else {
        backdrop.style.background = "rgba(0,0,0,.70)";
      }

      clone
        .animate(
          [
            {
              left: rect.left + "px",
              top: rect.top + "px",
              width: rect.width + "px",
              height: rect.height + "px",
              borderRadius: clone.style.borderRadius,
            },
            {
              left: targetX + "px",
              top: targetY + "px",
              width: targetW + "px",
              height: targetH + "px",
              borderRadius: "16px",
            },
          ],
          prefersNoMotion
            ? 0
            : { duration: 360, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
        )
        .finished.then(() => {
          setAnimating(false);
          setVisible(true); // 正方形フレームUIを表示
        // ← 追加：クローンを除去して二重表示を防ぐ
        if (cloneRef.current) {
          cloneRef.current.remove();
          cloneRef.current = null;
        }
        });
    });
  }, [item, originEl, box, prefersNoMotion]);

  const playClose = useCallback(async () => {
    if (!item || !originEl || box == null) return;
    const rect = originEl.getBoundingClientRect();
    const { innerWidth: vw, innerHeight: vh } = window;

    let clone = cloneRef.current;
    if (!clone) {
      clone = document.createElement("img");
      clone.src = item.src;
      clone.style.position = "fixed";
      clone.style.zIndex = "1000";
      document.body.appendChild(clone);
      cloneRef.current = clone;
    }

    // UI を隠してクローンで戻す
    setVisible(false);

    const targetW = box;
    const targetH = box;
    const targetX = Math.round((vw - targetW) / 2);
    const targetY = Math.round((vh - targetH) / 2);

    Object.assign(clone.style, {
      left: targetX + "px",
      top: targetY + "px",
      width: targetW + "px",
      height: targetH + "px",
      objectFit: "contain",
      borderRadius: "16px",
      boxShadow: "0 20px 60px rgba(0,0,0,.45)",
    } as CSSStyleDeclaration);

    const backdrop = backdropRef.current;

    setAnimating(true);
    await Promise.all([
      clone
        .animate(
          [
            {
              left: targetX + "px",
              top: targetY + "px",
              width: targetW + "px",
              height: targetH + "px",
              borderRadius: "16px",
            },
            {
              left: rect.left + "px",
              top: rect.top + "px",
              width: rect.width + "px",
              height: rect.height + "px",
              borderRadius: getComputedStyle(originEl).borderRadius || "16px",
            },
          ],
          prefersNoMotion
            ? 0
            : { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
        )
        .finished,
      new Promise<void>((resolve) => {
        if (!backdrop) return resolve();
        if (prefersNoMotion) {
          backdrop.style.background = "rgba(0,0,0,0)";
          backdrop.style.backdropFilter = "blur(0px)";
          resolve();
        } else {
          backdrop
            .animate(
              [
                { background: "rgba(0,0,0,.70)", backdropFilter: "blur(2px)" },
                { background: "rgba(0,0,0,0)", backdropFilter: "blur(0px)" },
              ],
              { duration: 240, easing: "linear", fill: "forwards" }
            )
            .finished.then(() => resolve());
        }
      }),
    ]);

    clone.remove();
    cloneRef.current = null;
    if (backdrop) {
      backdrop.remove();
      backdropRef.current = null;
    }
    setAnimating(false);
    onRequestClose();
  }, [item, originEl, box, onRequestClose, prefersNoMotion]);

  const close = useCallback(() => {
    if (animating) return;
    playClose();
  }, [animating, playClose]);

  // オープン時にアニメ開始
  useEffect(() => {
    if (open && item && originEl && box != null && mounted) {
      playOpen();
    }
  }, [open, item, originEl, box, mounted, playOpen]);

  if (!mounted || !open || !item || box == null) return null;

  // 表示UI（正方形フレーム内に object-contain）
  return createPortal(
    <>
      <div className="fixed inset-0 z-[950]" aria-modal="true" role="dialog" onClick={close} />
      {visible && (
        <div className="fixed inset-0 z-[980] flex items-center justify-center pointer-events-none" aria-hidden>
          <div
            className="relative rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-2xl bg-black/60 backdrop-blur-[2px] pointer-events-auto"
            style={{ width: `${box}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 画像エリア（正方形） */}
            <div className="relative" style={{ width: `${box}px`, height: `${box}px` }}>
              <NextImage
                src={item.src}
                alt={item.alt}
                fill
                className="object-contain"
                sizes={`${box}px`}
                priority
              />
            </div>

            {/* キャプション（画像サイズに影響させない：必要なら削除可） */}
            {(item.label || item.description) && (
              <div className="px-6 py-4 text-center bg-black/70 text-white space-y-2">
                {item.label && <h4 className="text-lg font-semibold">{item.label}</h4>}
                {item.description && (
                  <p className="text-sm leading-relaxed text-white/85">{item.description}</p>
                )}
              </div>
            )}

            <button
              aria-label="Close"
              onClick={close}
              className="absolute top-3 right-3 rounded-full bg-white/90 text-black px-3 py-1 text-sm hover:bg-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

/* ==================
   Hobby セクション
   ================== */
type Hobby = {
  src: string;
  alt: string;
  label?: string;
  description?: string;
};

/* 子コンポーネント：useTilt + originEl を親に渡す */
function HobbyTile({
  item,
  index,
  onOpen,
}: {
  item: Hobby;
  index: number;
  onOpen: (h: Hobby, el: HTMLElement) => void;
}) {
  const tiltRef = useTilt<HTMLDivElement>({ enabled: true, maxTilt: 14, scale: 1.03 });
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const handleOpen = () => {
    if (wrapperRef.current) onOpen(item, wrapperRef.current);
  };

  return (
    <article
      role="listitem"
      className="group relative aspect-square rounded-2xl overflow-hidden
                 bg-[#0f1217] ring-1 ring-white/8 shadow-[0_10px_30px_rgba(0,0,0,0.40)]
                 transition-transform duration-300 ease-out"
    >
      <div
        ref={(el) => {
          wrapperRef.current = el;
          if (tiltRef && "current" in tiltRef) (tiltRef as any).current = el;
        }}
        className="h-full w-full cursor-pointer"
        onClick={handleOpen}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) =>
          (e.key === "Enter" || e.key === " ") && handleOpen()
        }
        tabIndex={0}
        aria-label={`${item.alt} enlarge`}
      >
        <NextImage
          src={item.src}
          alt={item.alt}
          fill
          sizes="(min-width: 768px) 33vw, 50vw"
          className="object-cover grayscale contrast-125 brightness-95
                     transition-all duration-500 ease-out
                     group-hover:grayscale-0 group-hover:contrast-100 group-hover:brightness-100"
          priority={index < 3}
        />

        {/* ラベル・縁・光沢 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 text-white/95 text-sm font-medium">
          {item.label ?? item.alt}
        </div>
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-[#2ccdb9]/20 group-hover:ring-[#2ccdb9]/60" />
        <div className="pointer-events-none absolute -inset-40 rotate-12 bg-gradient-to-r from-transparent via-white/12 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
    </article>
  );
}

export default function HobbySection({
  title = "My Hobby",
  items = [
    { src: "/hobby/figaro.jpg", alt: "Figaro" },
    { src: "/hobby/snow.jpg", alt: "Snow Trip" },
    { src: "/hobby/NewYork.jpg", alt: "NewYork" },
    { src: "/hobby/camera.jpg", alt: "Photography" },
    { src: "/hobby/movie.jpg", alt: "Cinema" },
    { src: "/hobby/car.jpg", alt: "Car" },
  ],
}: {
  title?: string;
  items?: Hobby[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Hobby | null>(null);
  const [originEl, setOriginEl] = useState<HTMLElement | null>(null);

  const openModal = (item: Hobby, el: HTMLElement) => {
    setSelected(item);
    setOriginEl(el);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setSelected(null);
    setOriginEl(null);
  };

  return (
    <section className="w-full">
      {/* 見出し */}
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="h-px w-full bg-white/15" />
        <h3
          className="mt-10 text-center font-serif tracking-wide
                     text-[36px] md:text-[44px]
                     text-[#b6fff6] drop-shadow-[0_2px_10px_rgba(182,255,246,0.25)]"
        >
          <GlitchText as="span" text={title} trigger="scroll"/>
        </h3>
      </div>

      {/* グリッド */}
      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 gap-8" role="list">
          {items.map((it, i) => (
            <HobbyTile key={`${it.src}-${i}`} item={it} index={i} onOpen={openModal} />
          ))}
        </div>
      </div>

      {/* ズームモーダル */}
      <ZoomImageModal
        open={open}
        item={selected}
        originEl={originEl}
        onRequestClose={closeModal}
      />
    </section>
  );
}
