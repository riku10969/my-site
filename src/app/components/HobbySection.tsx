"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* =====================
   Tilt（3Dチルト）Hook
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

    const handleDown = () => {
      el.style.transition = "transform 80ms";
    };
    const handleUp = () => {
      el.style.transition = "transform 240ms ease";
    };

    // 初期状態
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

/* ================
   画像モーダル
   ================ */
function ImageModal({
  open,
  src,
  alt,
  label,
  description,
  onClose,
}: {
  open: boolean;
  src: string | null;
  alt: string;
  label?: string;
  description?: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted || !open || !src) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
      <div
        className="relative max-w-5xl w-[92vw] md:w-[80vw] max-h-[90vh]
                   grid grid-rows-[1fr_auto] rounded-2xl overflow-hidden
                   ring-1 ring-white/15 shadow-2xl bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 画像 */}
        <div className="relative row-start-1 min-h-[40vh]">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-contain"
            sizes="(min-width: 768px) 80vw, 92vw"
            priority
          />
        </div>

        {/* キャプション */}
        {(label || description) && (
          <div className="row-start-2 px-6 py-4 text-center bg-black/70 text-white space-y-2">
            {label && <h4 className="text-lg font-semibold">{label}</h4>}
            {description && (
              <p className="text-sm leading-relaxed text-white/85">{description}</p>
            )}
          </div>
        )}

        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full bg-white/90 text-black px-3 py-1 text-sm hover:bg-white"
        >
          ✕
        </button>
      </div>
    </div>,
    document.body
  );
}

/* ==================
   Hobby セクション
   ================== */
type Hobby = {
  src: string;
  alt: string;
  label?: string; // タイトル
  description?: string; // 説明文
};

/* 子コンポーネント：ここで useTilt を呼ぶ */
function HobbyTile({
  item,
  index,
  onOpen,
}: {
  item: Hobby;
  index: number;
  onOpen: (h: Hobby) => void;
}) {
  const tiltRef = useTilt<HTMLDivElement>({ enabled: true, maxTilt: 14, scale: 1.03 });

  return (
    <article
      role="listitem"
      className="group relative aspect-square rounded-2xl overflow-hidden
                 bg-[#0f1217] ring-1 ring-white/8 shadow-[0_10px_30px_rgba(0,0,0,0.40)]
                 transition-transform duration-300 ease-out"
    >
      <div
        ref={tiltRef}
        className="h-full w-full cursor-pointer"
        onClick={() => onOpen(item)}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) =>
          (e.key === "Enter" || e.key === " ") && onOpen(item)
        }
        tabIndex={0}
        aria-label={`${item.alt} enlarge`}
      >
        <Image
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
    { src: "/hobby/aquarium.jpg", alt: "Aquarium" },
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

  const openModal = (item: Hobby) => {
    setSelected(item);
    setOpen(true);
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
          {title}
        </h3>
      </div>

      {/* グリッド（チルト＋クリックで拡大） */}
      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 gap-8" role="list">
          {items.map((it, i) => (
            <HobbyTile key={`${it.src}-${i}`} item={it} index={i} onOpen={openModal} />
          ))}
        </div>
      </div>

      {/* モーダル */}
      <ImageModal
        open={open}
        src={selected?.src ?? null}
        alt={selected?.alt ?? "Hobby image"}
        label={selected?.label ?? selected?.alt}
        description={selected?.description}
        onClose={() => setOpen(false)}
      />
    </section>
  );
}
