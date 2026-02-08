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
   ZoomImageModal（タイルと同じサイズ・スムーズな開閉）
   ================== */

const EASE_SMOOTH = "cubic-bezier(0.33, 1, 0.68, 1)";
const DURATION_OPEN_MS = 420;
const DURATION_CLOSE_MS = 380;
const DURATION_BACKDROP_MS = 280;
const MODAL_MAX_SIZE = 520;
const MODAL_VIEWPORT_RATIO = 0.82;

function ZoomImageModal({
  open,
  item,
  originEl,
  onRequestClose,
}: {
  open: boolean;
  item: { src: string; alt: string; label?: string; description?: string; category?: string; meta?: string[] } | null;
  originEl: HTMLElement | null;
  onRequestClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(false);
  const [originSize, setOriginSize] = useState<{ w: number; h: number } | null>(null);
  const [modalSize, setModalSize] = useState<{ w: number; h: number } | null>(null);
  const cloneRef = useRef<HTMLImageElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  const prefersNoMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const playOpen = useCallback(() => {
    if (!item || !originEl) return;
    const rect = originEl.getBoundingClientRect();
    const { innerWidth: vw, innerHeight: vh } = window;
    const size = Math.min(MODAL_MAX_SIZE, vw * MODAL_VIEWPORT_RATIO, vh * MODAL_VIEWPORT_RATIO);
    const modalW = Math.round(size);
    const modalH = Math.round(size);
    const targetX = Math.round((vw - modalW) / 2);
    const targetY = Math.round((vh - modalH) / 2);

    setOriginSize({ w: rect.width, h: rect.height });
    setModalSize({ w: modalW, h: modalH });

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

    const backdrop = document.createElement("div");
    Object.assign(backdrop.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0)",
      backdropFilter: "blur(0px)",
      transition: prefersNoMotion ? "none" : `background ${DURATION_BACKDROP_MS}ms ${EASE_SMOOTH}, backdrop-filter ${DURATION_BACKDROP_MS}ms ${EASE_SMOOTH}`,
      zIndex: "900",
    } as CSSStyleDeclaration);
    backdropRef.current = backdrop;

    document.body.appendChild(backdrop);
    document.body.appendChild(clone);

    setAnimating(true);
    requestAnimationFrame(() => {
      if (!prefersNoMotion) {
        backdrop.style.background = "rgba(0,0,0,.72)";
        backdrop.style.backdropFilter = "blur(4px)";
      } else {
        backdrop.style.background = "rgba(0,0,0,.72)";
      }
      clone
        .animate(
          [
            {
              left: rect.left + "px",
              top: rect.top + "px",
              width: rect.width + "px",
              height: rect.height + "px",
              borderRadius: getComputedStyle(originEl).borderRadius || "16px",
            },
            {
              left: targetX + "px",
              top: targetY + "px",
              width: modalW + "px",
              height: modalH + "px",
              borderRadius: "20px",
            },
          ],
          prefersNoMotion ? 0 : { duration: DURATION_OPEN_MS, easing: EASE_SMOOTH, fill: "forwards" }
        )
        .finished.then(() => {
          setAnimating(false);
          setVisible(true);
          if (cloneRef.current) {
            cloneRef.current.remove();
            cloneRef.current = null;
          }
        });
    });
  }, [item, originEl, prefersNoMotion]);

  const playClose = useCallback(async () => {
    if (!item || !originEl || !originSize || !modalSize) return;
    const rect = originEl.getBoundingClientRect();
    const { innerWidth: vw, innerHeight: vh } = window;
    const startX = Math.round((vw - modalSize.w) / 2);
    const startY = Math.round((vh - modalSize.h) / 2);

    let clone = cloneRef.current;
    if (!clone) {
      clone = document.createElement("img");
      clone.src = item.src;
      clone.style.position = "fixed";
      clone.style.zIndex = "1000";
      document.body.appendChild(clone);
      cloneRef.current = clone;
    }

    setVisible(false);

    Object.assign(clone.style, {
      left: startX + "px",
      top: startY + "px",
      width: modalSize.w + "px",
      height: modalSize.h + "px",
      objectFit: "cover",
      borderRadius: "20px",
      boxShadow: "0 20px 60px rgba(0,0,0,.45)",
    } as CSSStyleDeclaration);

    const backdrop = backdropRef.current;
    setAnimating(true);

    await Promise.all([
      clone.animate(
        [
          { left: startX + "px", top: startY + "px", width: modalSize.w + "px", height: modalSize.h + "px", borderRadius: "20px" },
          {
            left: rect.left + "px",
            top: rect.top + "px",
            width: rect.width + "px",
            height: rect.height + "px",
            borderRadius: getComputedStyle(originEl).borderRadius || "16px",
          },
        ],
        prefersNoMotion ? 0 : { duration: DURATION_CLOSE_MS, easing: EASE_SMOOTH, fill: "forwards" }
      ).finished,
      new Promise<void>((resolve) => {
        if (!backdrop) return resolve();
        if (prefersNoMotion) {
          backdrop.style.background = "rgba(0,0,0,0)";
          backdrop.style.backdropFilter = "blur(0px)";
          resolve();
        } else {
          backdrop.animate(
            [
              { background: "rgba(0,0,0,.72)", backdropFilter: "blur(4px)" },
              { background: "rgba(0,0,0,0)", backdropFilter: "blur(0px)" },
            ],
            { duration: DURATION_BACKDROP_MS, easing: EASE_SMOOTH, fill: "forwards" }
          ).finished.then(() => resolve());
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
    setOriginSize(null);
    setModalSize(null);
    onRequestClose();
  }, [item, originEl, originSize, modalSize, onRequestClose, prefersNoMotion]);

  const close = useCallback(() => {
    if (animating) return;
    playClose();
  }, [animating, playClose]);

  useEffect(() => {
    if (open && item && originEl && mounted) playOpen();
  }, [open, item, originEl, mounted, playOpen]);

  if (!mounted || !open || !item) return null;

  const category = item.category ?? item.alt.toUpperCase().replace(/\s+/g, " ");
  const hasMeta = item.meta && item.meta.length > 0;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[950]" aria-modal="true" role="dialog" onClick={close} />
      {visible && modalSize && (
        <div className="fixed inset-0 z-[980] flex items-center justify-center pointer-events-none" aria-hidden>
          <div
            className="relative rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-2xl bg-black/70 backdrop-blur-[2px] pointer-events-auto flex flex-col max-w-[90vw]"
            style={{ width: modalSize.w }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative shrink-0" style={{ width: modalSize.w, height: modalSize.h }}>
              <NextImage
                src={item.src}
                alt={item.alt}
                fill
                className="object-cover"
                sizes={`${modalSize.w}px`}
                priority
              />
            </div>

            <div className="px-6 py-5 text-center space-y-3 min-w-0">
              <div className="text-xl md:text-2xl uppercase tracking-[0.15em] text-white/50 font-medium">
                {category}
              </div>
              {item.description && (
                <p className="text-lg md:text-xl leading-relaxed text-white/85">
                  {item.description}
                </p>
              )}
              {hasMeta && (
                <div className="text-base text-white/40 font-mono space-y-0.5 pt-0.5">
                  {item.meta!.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>

            <button
              aria-label="Close"
              onClick={close}
              className="absolute top-4 right-4 rounded-full bg-white/90 text-black px-4 py-2 text-base hover:bg-white transition-colors"
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
  category?: string;
  meta?: string[];
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
    { src: "/hobby/movie1.jpg", alt: "Cinema" },
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
        <div className="h-px w-full bg-white/12" />
        <h3
          className="mt-10 text-center font-serif tracking-wide
                     text-[36px] md:text-[44px]
                     text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]"
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
