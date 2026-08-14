"use client";

import NextImage from "next/image";
import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useZoomFlip } from "../gsap/ZoomFlip";
import GlitchText from "../ui/GlitchText";

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

const MODAL_MAX_SIZE = 520;
const MODAL_VIEWPORT_RATIO = 0.82;
/** 画像の角丸（拡大表示時）。縮小中は Flip の scale と一緒に見た目も縮む */
const MODAL_RADIUS = 20;

type ZoomItem = {
  src: string;
  alt: string;
  label?: string;
  description?: string;
  category?: string;
  meta?: string[];
};

/** 中央に置く正方形の画像エリアの座標とサイズ */
function measureModalBox() {
  const { innerWidth: vw, innerHeight: vh } = window;
  const size = Math.round(
    Math.min(MODAL_MAX_SIZE, vw * MODAL_VIEWPORT_RATIO, vh * MODAL_VIEWPORT_RATIO)
  );
  return {
    w: size,
    h: size,
    x: Math.round((vw - size) / 2),
    y: Math.round((vh - size) / 2),
  };
}

function ZoomImageModal({
  open,
  item,
  originEl,
  onRequestClose,
}: {
  open: boolean;
  item: ZoomItem | null;
  originEl: HTMLElement | null;
  onRequestClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [box, setBox] = useState<ReturnType<typeof measureModalBox> | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // 開閉アニメーションは gsap/ZoomFlip に委譲。ここは ref を配るだけ
  const { backdropRef, imageRef, chromeRef, playOpen, playClose, isAnimating, dispose } =
    useZoomFlip(originEl);

  useEffect(() => setMounted(true), []);
  useEffect(() => dispose, [dispose]);

  // 開くときにサイズを測る。ここで state を持つので、次のレンダーで
  // 画像とパネルが「開いた状態の座標」で DOM に載る。
  // useEffect にすると測るまでに1フレーム余計に待つことになる
  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    setBox(measureModalBox());
  }, [open]);

  // 画像が最終位置に載った直後にタイルへ引き戻してから開く。
  // paint 前に走らせないと拡大状態が1フレーム見えてしまうので useLayoutEffect。
  // 開ききったら閉じるボタンへフォーカスを移す
  useLayoutEffect(() => {
    if (!open || !box) return;
    playOpen(() => closeBtnRef.current?.focus());
  }, [open, box, playOpen]);

  const close = useCallback(() => {
    if (isAnimating()) return;
    playClose(onRequestClose);
  }, [isAnimating, playClose, onRequestClose]);

  // close は親が再レンダーされると同一性が変わる。依存に入れると
  // 開いている最中に後片付けが走ってフォーカスを奪われるので ref 経由で読む
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  // フォーカストラップ。モーダル以外の body 直下の要素を inert にして、
  // Tab / Shift+Tab が背後のページ（ヘッダーのリンクや Hobby のタイル）へ
  // 抜けないようにする。aria-modal は読み上げ範囲にしか効かないので別途必要。
  useEffect(() => {
    if (!open || !box) return;

    const own = [backdropRef.current, imageRef.current, chromeRef.current].filter(
      Boolean
    ) as Element[];
    const inerted: Element[] = [];

    Array.from(document.body.children).forEach((child) => {
      // モーダル自身（portal で body 直下に入る）は対象外
      if (own.some((node) => child.contains(node))) return;
      // 元から inert なものは触らない（戻すときに他の機能を壊さないため）
      if (child.hasAttribute("inert")) return;
      child.setAttribute("inert", "");
      inerted.push(child);
    });

    return () => inerted.forEach((el) => el.removeAttribute("inert"));
  }, [open, box, backdropRef, imageRef, chromeRef]);

  // Esc で閉じる + 背面スクロール固定 + フォーカスの復帰
  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      // inert が付いたままの要素はフォーカスできないので、上の effect の
      // 後片付け（inert 解除）が終わってから戻す。1フレーム遅らせることで
      // effect の定義順に依存しないようにしている
      const el = restoreFocusRef.current;
      requestAnimationFrame(() => el?.focus?.());
    };
  }, [open]);

  if (!mounted || !open || !item || !box) return null;

  const category = item.category ?? item.alt.toUpperCase().replace(/\s+/g, " ");
  const hasMeta = item.meta && item.meta.length > 0;

  return createPortal(
    <>
      {/* 背景。クリックで閉じる */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-[950] bg-black/70 backdrop-blur-[4px] opacity-0"
        onClick={close}
        aria-hidden
      />

      {/* 画像。パネルの中に入れると overflow: hidden で縮小中が切られるので
          独立したレイヤーに置く（旧実装のクローンと同じ重なり順） */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={item.src}
        alt={item.alt}
        className="fixed z-[1000] object-cover shadow-[0_20px_60px_rgba(0,0,0,.45)]"
        style={{
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          borderRadius: MODAL_RADIUS,
        }}
      />

      {/* 文言と閉じるボタン */}
      <div ref={chromeRef} className="fixed inset-0 z-[1001] pointer-events-none opacity-0">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={item.label ?? item.alt}
          className="absolute rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-2xl pointer-events-auto flex flex-col max-w-[90vw]"
          style={{ width: box.w, left: box.x, top: box.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 画像エリアぶんの余白。実際の画像は上のレイヤーが描いている */}
          <div className="shrink-0 pointer-events-none" style={{ width: box.w, height: box.h }} />

          <div className="shrink-0 px-6 py-5 text-center space-y-3 min-w-0 bg-[#0d0d0d]">
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
            ref={closeBtnRef}
            aria-label="Close"
            onClick={close}
            className="absolute top-2 right-2 rounded-full bg-white/90 text-black w-10 h-10 flex items-center justify-center text-lg hover:bg-white transition-colors shadow-lg"
          >
            ✕
          </button>
        </div>
      </div>
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
        // チルト用と originEl 用で同じ要素を2つの ref に配る
        ref={(el) => {
          wrapperRef.current = el;
          tiltRef.current = el;
        }}
        className="h-full w-full cursor-pointer"
        onClick={handleOpen}
        // div なので button 相当の挙動を自前で用意する。
        // preventDefault が無いと Space がブラウザ標準のページスクロールとして残り、
        // モーダルを開くのと同時に裏のページがずれる
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpen();
          }
        }}
        role="button"
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
    { src: "/hobby/figaro.webp", alt: "Figaro" },
    { src: "/hobby/snow.webp", alt: "Snow Trip" },
    { src: "/hobby/NewYork.webp", alt: "NewYork" },
    { src: "/hobby/camera.webp", alt: "Photography" },
    { src: "/hobby/movie1.webp", alt: "Cinema" },
    { src: "/hobby/car.webp", alt: "Car" },
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
