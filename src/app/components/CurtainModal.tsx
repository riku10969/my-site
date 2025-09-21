"use client";
import { useEffect, useMemo, useRef, useState } from "react";

export type WorkKind = "graphic" | "web";

type ImageEntry =
  | string
  | {
      src: string;
      /** 画像個別の説明（なければ item.description を表示） */
      desc?: string;
      /** 画像個別のサブタイトル（なければ item.subtitle を表示） */
      subtitle?: string;
    };

export type WorkItem = {
  src: string;
  title?: string;
  /** 作品全体のサブタイトル */
  subtitle?: string;
  /** 作品全体の説明（各画像に desc があればそちらを優先） */
  description?: string;
  tools?: string[];
  languages?: string[];
  period?: string;
  kind?: WorkKind;
  link?: string;
  linkLabel?: string;
  /** 画像配列。string か {src, desc?, subtitle?} に対応 */
  images?: ImageEntry[];
};

type Props = {
  open: boolean;
  item: WorkItem | null;
  onRequestClose: () => void;
  duration?: number;
};

export default function CurtainModal({
  open,
  item,
  onRequestClose,
  duration = 800,
}: Props) {
  // ---- Hooks（先頭で宣言保持）----
  const [visible, setVisible] = useState(open);
  const [phase, setPhase] = useState<"idle" | "enter" | "exit">("idle");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [imgIndex, setImgIndex] = useState(0);

  // 画像配列を正規化（string -> {src}）
  const gallery = useMemo(() => {
    if (!item) return [] as { src: string; desc?: string; subtitle?: string }[];
    const base = item.images?.length ? item.images : item.src ? [item.src] : [];
    return base.map((g) =>
      typeof g === "string" ? { src: g } : { src: g.src, desc: g.desc, subtitle: g.subtitle }
    );
  }, [item]);

  // 表示中画像に応じた説明とサブタイトルを算出
  const currentDesc = useMemo(() => {
    if (!item || !gallery.length) return "";
    return gallery[imgIndex]?.desc ?? item.description ?? "";
  }, [item, gallery, imgIndex]);

  const currentSubtitle = useMemo(() => {
    if (!item || !gallery.length) return item?.subtitle ?? "";
    return gallery[imgIndex]?.subtitle ?? item.subtitle ?? "";
  }, [item, gallery, imgIndex]);

  // open の変化
  useEffect(() => {
    if (open) {
      setVisible(true);
      setImgIndex(0);
      requestAnimationFrame(() => setPhase("enter"));
      document.documentElement.classList.add("modal-open");
    } else if (visible) {
      setPhase("exit");
      const t = setTimeout(() => {
        setVisible(false);
        setPhase("idle");
        document.documentElement.classList.remove("modal-open");
      }, duration);
      return () => clearTimeout(t);
    }
  }, [open, visible, duration]);

  // ESC で閉じる
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRequestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onRequestClose]);

  if (!visible) return null;

  return (
    <div
      ref={rootRef}
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-[999] overflow-hidden"
    >
      {/* 背景クリックで閉じる */}
      <button
        aria-label="Close"
        className={`absolute inset-0 w-full h-full cursor-default transition-opacity duration-300 ${
          phase === "enter" ? "bg-black/50 backdrop-blur-[2px] opacity-100" : "opacity-0"
        }`}
        onClick={onRequestClose}
      />

      {/* 左からスライドするカーテン */}
      <div
        className={`
          absolute inset-y-0 left-0 will-change-transform
          bg-[#0e0e0e] shadow-2xl
          ${phase === "enter" ? "curtain-in" : ""}
          ${phase === "exit" ? "curtain-out" : ""}
        `}
        style={{ width: "min(860px,92vw)", ["--t" as any]: `${duration}ms` } as React.CSSProperties}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="text-white/80 text-sm tracking-wide">Detail</div>
          <button
            onClick={onRequestClose}
            className="rounded-full px-3 py-1 text-sm bg-white/10 text-white/90 hover:bg-white/20 transition"
          >
            Close
          </button>
        </div>

        {/* 本文（タブ廃止 → 単一レイアウト） */}
        <div
          className={`
            h-[calc(100vh-56px)] overflow-y-auto
            opacity-0 translate-y-2
            ${phase === "enter" ? "content-in" : ""}
            ${phase === "exit" ? "content-out" : ""}
          `}
          style={{ ["--t" as any]: `${Math.max(240, duration * 0.45)}ms` } as React.CSSProperties}
        >
          <section className="p-4 md:p-6 text-white">
            {/* タイトル + サブタイトル + 外部リンク */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div>
                <h3 className="text-2xl font-semibold leading-tight">
                  {item?.title ?? "Untitled"}
                </h3>
                {!!currentSubtitle && (
                  <p className="text-white/70 text-sm mt-1">{currentSubtitle}</p>
                )}
              </div>

              {item?.kind === "web" && item?.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/90 hover:bg-teal-500 text-black font-medium transition"
                >
                  {item.linkLabel ?? "サイトへ移動"}
                </a>
              )}
            </div>

            {/* 画像とサムネ */}
            {!!gallery.length && (
              <div className="mb-4">
                <img
                  src={gallery[imgIndex].src}
                  alt={item?.title ?? ""}
                  className="w-full max-h-[420px] object-contain rounded-xl border border-white/10 mb-3"
                />
                {gallery.length > 1 && (
                  <ul className="flex flex-wrap gap-2">
                    {gallery.map((g, i) => (
                      <li key={typeof g === "string" ? g : g.src}>
                        <button
                          onClick={() => setImgIndex(i)}
                          className={`border rounded-md overflow-hidden block transition
                            ${i === imgIndex ? "border-teal-400" : "border-white/15 hover:border-white/35"}`}
                        >
                          <img
                            src={(typeof g === "string" ? g : g.src) as string}
                            alt={`thumb-${i + 1}`}
                            className="w-20 h-14 object-cover"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* 説明（画像ごとに切り替え。なければ全体説明） */}
            {!!(currentDesc || item?.description) && (
              <p className="text-white/85 leading-relaxed whitespace-pre-wrap mb-6">
                {currentDesc}
              </p>
            )}

            {/* メタ情報（タブ廃止に伴いフラットに表示） */}
            <div className="grid gap-4 md:grid-cols-3">
              {!!item?.period && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <h4 className="text-sm text-white/60 mb-1">作成期間</h4>
                  <div className="text-white/85 text-sm">{item.period}</div>
                </div>
              )}
              {!!item?.tools?.length && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <h4 className="text-sm text-white/60 mb-2">使用ツール</h4>
                  <ul className="flex flex-wrap gap-2">
                    {item.tools!.map((t) => (
                      <li
                        key={t}
                        className="px-2 py-1 rounded bg-white/10 border border-white/10 text-white/80 text-xs"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!!item?.languages?.length && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <h4 className="text-sm text-white/60 mb-2">使用言語</h4>
                  <ul className="flex flex-wrap gap-2">
                    {item.languages!.map((l) => (
                      <li
                        key={l}
                        className="px-2 py-1 rounded bg-white/10 border border-white/10 text-white/80 text-xs"
                      >
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* アニメーション（タブ関連は削除） */}
      <style jsx global>{`
        .modal-open, .modal-open body { overflow: hidden; }
        .curtain-in  { animation: curtainIn var(--t) cubic-bezier(.22,.61,.36,1) forwards; }
        .curtain-out { animation: curtainOut var(--t) cubic-bezier(.22,.61,.36,1) forwards; }
        @keyframes curtainIn  { 0% { transform: translateX(-100%);} 100% { transform: translateX(0%);} }
        @keyframes curtainOut { 0% { transform: translateX(0%);} 100% { transform: translateX(-100%);} }
        .content-in  { animation: contentIn  var(--t) ease forwards; animation-delay: 60ms; }
        .content-out { animation: contentOut var(--t) ease forwards; }
        @keyframes contentIn  { 0% { opacity: 0; transform: translateY(8px);} 100% { opacity: 1; transform: translateY(0);} }
        @keyframes contentOut { 0% { opacity: 1; transform: translateY(0);} 100% { opacity: 0; transform: translateY(6px);} }
      `}</style>
    </div>
  );
}
