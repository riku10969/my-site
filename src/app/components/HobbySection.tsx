"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* =====================
   Tilt（3Dチルト）Hook
   ===================== */
function useTilt(maxTilt = 12, scale = 1.02) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const px = (x / rect.width) * 2 - 1;  // -1 .. 1
      const py = (y / rect.height) * 2 - 1; // -1 .. 1
      const rx = (-py * maxTilt).toFixed(2);
      const ry = (px * maxTilt).toFixed(2);
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
      el.style.boxShadow =
        `0 18px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(44,205,185,0.20)`;
    };

    const reset = () => {
      el.style.transform = `perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)`;
      el.style.boxShadow =
        `0 10px 30px rgba(0,0,0,0.40), 0 0 0 1px rgba(44,205,185,0.12)`;
    };

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", reset);
    el.addEventListener("mousedown", () => (el.style.transition = "transform 80ms"));
    el.addEventListener("mouseup", () => (el.style.transition = "transform 240ms ease"));

    // 初期化
    el.style.transition = "transform 240ms ease, box-shadow 240ms ease";
    reset();

    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", reset);
    };
  }, [maxTilt, scale]);

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

  {/* ★ 修正：高さを持つ grid レイアウトに */}
  <div
    className="relative max-w-5xl w-[92vw] md:w-[80vw] max-h-[90vh]
               grid grid-rows-[1fr_auto] rounded-2xl overflow-hidden
               ring-1 ring-white/15 shadow-2xl bg-black"
    onClick={(e) => e.stopPropagation()}
  >
    {/* 画像エリア：必ず高さを持たせる */}
    <div className="relative row-start-1 min-h-[40vh]">
      <Image
        src={src!}
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
  label?: string;       // タイトル
  description?: string; // 説明文
};


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
      {/* 見出し：読みやすい明度で */}
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
          {items.map((it, i) => {
            const tiltRef = useTilt(14, 1.03);
            return (
              <article
                key={i}
                role="listitem"
                className="group relative aspect-square rounded-2xl overflow-hidden
                           bg-[#0f1217] ring-1 ring-white/8 shadow-[0_10px_30px_rgba(0,0,0,0.40)]
                           transition-transform duration-300 ease-out"
              >
                {/* 外側に3D変形を掛ける */}
                <div
                  ref={tiltRef}
                  className="h-full w-full cursor-pointer"
                  onClick={() => openModal(it)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openModal(it)}
                  tabIndex={0}
                  aria-label={`${it.alt} enlarge`}
                >
                  <Image
                    src={it.src}
                    alt={it.alt}
                    fill
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover grayscale contrast-125 brightness-95
                               transition-all duration-500 ease-out
                               group-hover:grayscale-0 group-hover:contrast-100 group-hover:brightness-100"
                    priority={i < 3}
                  />

                  {/* ラベル・縁・光沢 */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white/95 text-sm font-medium">
                    {it.label ?? it.alt}
                  </div>
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-[#2ccdb9]/20 group-hover:ring-[#2ccdb9]/60" />
                  <div className="pointer-events-none absolute -inset-40 rotate-12 bg-gradient-to-r from-transparent via-white/12 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* モーダル */}
      <ImageModal
  open={open}
  src={selected?.src ?? null}
  alt={selected?.alt ?? "Hobby image"}
  label={selected?.label ?? selected?.alt}
  description={selected?.description}   // ← 説明文を渡す
  onClose={() => setOpen(false)}
/>
    </section>
  );
}
