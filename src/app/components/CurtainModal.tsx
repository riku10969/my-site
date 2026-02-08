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

  // 画像配列を正規化（string -> {src}）
  const gallery = useMemo(() => {
    if (!item) return [] as { src: string; desc?: string; subtitle?: string }[];
    const base = item.images?.length ? item.images : item.src ? [item.src] : [];
    return base.map((g) =>
      typeof g === "string" ? { src: g } : { src: g.src, desc: g.desc, subtitle: g.subtitle }
    );
  }, [item]);

  // open の変化
  useEffect(() => {
    if (open) {
      setVisible(true);
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
      className="fixed inset-0 z-[99999] overflow-hidden"
    >
      {/* 背景クリックで閉じる */}
      <button
        aria-label="Close"
        className={`absolute inset-0 w-full h-full cursor-default transition-opacity duration-300 ${
          phase === "enter" ? "bg-black/50 backdrop-blur-[2px] opacity-100" : "opacity-0"
        }`}
        onClick={onRequestClose}
      />

      {/* 左からスライドするカーテン（高さ全表示・幅デスクトップ70%/モバイル85%） */}
      <div
        className={`
          absolute inset-y-0 left-0 w-[85vw] md:w-[70vw] will-change-transform flex flex-col
          bg-[#0e0e0e] shadow-2xl rounded-r-2xl overflow-hidden
          ${phase === "enter" ? "curtain-in" : ""}
          ${phase === "exit" ? "curtain-out" : ""}
        `}
        style={{ ["--t" as any]: `${duration}ms` } as React.CSSProperties}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
          <div className="text-white/70 text-xs font-medium tracking-[0.2em] uppercase">Detail</div>
          <button
            onClick={onRequestClose}
            className="rounded-full px-4 py-2 text-sm font-medium bg-white/10 text-white/90 hover:bg-white/20 hover:border-[#2ccdb9]/40 border border-transparent transition-all"
          >
            Close
          </button>
        </div>

        {/* 本文（スクロールで全画像を表示） */}
        <div
          className={`
            flex-1 min-h-0 overflow-y-auto
            opacity-0 translate-y-2
            ${phase === "enter" ? "content-in" : ""}
            ${phase === "exit" ? "content-out" : ""}
          `}
          style={{ ["--t" as any]: `${Math.max(240, duration * 0.45)}ms` } as React.CSSProperties}
        >
          <section className="p-4 md:p-6 text-white">
            {/* タイトル + 外部リンク */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div>
                <h3 className="font-serif text-2xl font-semibold leading-tight md:text-4xl lg:text-5xl">
                  {item?.title ?? "Untitled"}
                </h3>
              </div>

              {item?.kind === "web" && item?.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2ccdb9]/20 border border-[#2ccdb9]/40 text-[#2ccdb9] hover:bg-[#2ccdb9]/30 font-medium transition"
                >
                  {item.linkLabel ?? "サイトへ移動"}
                </a>
              )}
            </div>

            {/* 画像を縦にスクロール配置（クリック切り替え廃止） */}
            {!!gallery.length && (
              <div className="space-y-0 mb-6">
                {gallery.map((g, i) => (
                  <div
                    key={i}
                    className={`space-y-4 py-6 ${
                      i > 0
                        ? "border-t border-white/15"
                        : ""
                    }`}
                  >
                    <img
                      src={g.src}
                      alt={item?.title ?? `Image ${i + 1}`}
                      className={`object-contain rounded-xl border border-white/10 ${
                        i === 0
                          ? "w-full max-h-[520px]"
                          : "w-1/2 max-w-[50%] min-w-[200px]"
                      }`}
                    />
                    {((g.subtitle ?? g.desc) || (i === 0 && item?.description)) && (
                      <p className={`text-white/85 leading-relaxed whitespace-pre-wrap ${
                        i === 0 ? "text-base md:text-2xl" : "text-sm md:text-xl"
                      }`}>
                        {g.subtitle ?? g.desc ?? item?.description ?? ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* メタ情報（作成期間・使用ツールは各40%、文字大きく） */}
            <div className="flex flex-wrap gap-4">
              {!!item?.period && (
                <div className="w-[40%] min-w-[180px] rounded-xl border border-white/10 bg-white/[0.04] p-5">
                  <h4 className="text-xs md:text-sm font-medium tracking-wider text-white/50 mb-3 uppercase">Period</h4>
                  <div className="font-serif text-white/90 text-sm md:text-lg">{item.period}</div>
                </div>
              )}
              {!!item?.tools?.length && (
                <div className="w-[40%] min-w-[180px] rounded-xl border border-white/10 bg-white/[0.04] p-5">
                  <h4 className="text-xs md:text-sm font-medium tracking-wider text-white/50 mb-3 uppercase">Tools</h4>
                  <ul className="flex flex-wrap gap-2">
                    {item.tools!.map((t) => (
                      <li
                        key={t}
                        className="px-3 py-1.5 rounded-lg bg-[#2ccdb9]/10 border border-[#2ccdb9]/20 text-white/90 text-xs md:text-sm"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!!item?.languages?.length && (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 flex-1 min-w-[140px]">
                  <h4 className="text-xs md:text-sm font-medium tracking-wider text-white/50 mb-3 uppercase">Languages</h4>
                  <ul className="flex flex-wrap gap-2">
                    {item.languages!.map((l) => (
                      <li
                        key={l}
                        className="px-3 py-1.5 rounded-lg bg-[#A855F7]/10 border border-[#A855F7]/20 text-white/90 text-xs md:text-sm"
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
        @keyframes curtainIn  { 0% { transform: translateX(-100%);} 100% { transform: translateX(0);} }
        @keyframes curtainOut { 0% { transform: translateX(0);} 100% { transform: translateX(-100%);} }
        .content-in  { animation: contentIn  var(--t) ease forwards; animation-delay: 60ms; }
        .content-out { animation: contentOut var(--t) ease forwards; }
        @keyframes contentIn  { 0% { opacity: 0; transform: translateY(8px);} 100% { opacity: 1; transform: translateY(0);} }
        @keyframes contentOut { 0% { opacity: 1; transform: translateY(0);} 100% { opacity: 0; transform: translateY(6px);} }
      `}</style>
    </div>
  );
}
