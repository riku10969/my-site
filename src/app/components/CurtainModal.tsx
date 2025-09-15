"use client";
import { useEffect, useRef, useState } from "react";

export type WorkKind = "graphic" | "web";

export type WorkItem = {
  src: string;
  title?: string;
  description?: string;
  tools?: string[];       // Illustrator / Figma / Photoshop / React / ...
  languages?: string[];   // TypeScript / HTML / CSS / ...
  period?: string;        // 2025.06 など
  kind?: WorkKind;        // "web" のときにリンクを表示
  link?: string;          // 外部サイト or デプロイURL
  linkLabel?: string;     // ボタンに表示する文言（未指定なら "Visit site"）
};

type Props = {
  open: boolean;
  item: WorkItem | null;
  onRequestClose: () => void;
  /** アニメ全体の長さ(ms) */
  duration?: number;
};

export default function CurtainModal({
  open,
  item,
  onRequestClose,
  duration = 800,
}: Props) {
  const [visible, setVisible] = useState(open);
  const [phase, setPhase] = useState<"idle" | "enter" | "exit">("idle");
  const rootRef = useRef<HTMLDivElement | null>(null);

  // open の変化に追随（マウント/アンマウント制御）
  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => setPhase("enter"));
      document.documentElement.classList.add("modal-open");
    } else if (visible) {
      setPhase("exit");
      // アニメ後にアンマウント
      const t = setTimeout(() => {
        setVisible(false);
        setPhase("idle");
        document.documentElement.classList.remove("modal-open");
      }, duration);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      {/* 背景（クリックで閉じる） */}
      <button
        aria-label="Close"
        className={`absolute inset-0 w-full h-full cursor-default transition-opacity duration-300 ${
          phase === "enter" ? "bg-black/50 backdrop-blur-[2px] opacity-100" : "opacity-0"
        }`}
        onClick={onRequestClose}
      />

      {/* カーテン（左端からスライドイン→固定、閉じると逆再生） */}
      <div
        className={`
          absolute inset-y-0 left-0 will-change-transform
          bg-[#0e0e0e] shadow-2xl
          ${phase === "enter" ? "curtain-in" : ""}
          ${phase === "exit" ? "curtain-out" : ""}
        `}
        style={
          {
            width: "min(860px, 92vw)",
            ["--t" as any]: `${duration}ms`,
          } as React.CSSProperties
        }
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

        {/* コンテンツ */}
        {/* コンテンツ */}
<div
  className={`
    h-[calc(100vh-56px)] overflow-y-auto
    opacity-0 translate-y-2
    ${phase === "enter" ? "content-in" : ""}
    ${phase === "exit" ? "content-out" : ""}
  `}
  style={{ ["--t" as any]: `${Math.max(240, duration * 0.45)}ms` } as React.CSSProperties}
>
  {item && (
    <article className="p-6 text-white">
      {/* 画像 */}
      <img
        src={item.src}
        alt={item.title ?? ""}
        className="w-full max-h-[420px] object-contain rounded-xl border border-white/10 mb-5"
      />

      {/* タイトル + （Web ならリンクボタン） */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h3 className="text-2xl font-semibold leading-tight">{item.title ?? "Untitled"}</h3>

        {item.kind === "web" && item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/90 hover:bg-teal-500 text-black font-medium transition"
            aria-label={`${item.title ?? "This work"} を新しいタブで開く`}
          >
            {/* ↗ のような外部リンクアイコン代替（テキストでもOK） */}
            <span>{item.linkLabel ?? "Visit site"}</span>
          </a>
        )}
      </div>

      {/* メタ情報（期間 / ツール / 言語） */}
      {(item.period || item.tools?.length || item.languages?.length) && (
        <div className="mb-5 space-y-2">
          {item.period && (
            <div className="text-sm text-white/70">
              <span className="inline-block w-16 text-white/50">Period</span>
              <span className="align-middle">{item.period}</span>
            </div>
          )}

          {item.tools?.length ? (
            <div className="text-sm">
              <span className="inline-block w-16 text-white/50 align-top">Tools</span>
              <ul className="inline-flex flex-wrap gap-2 align-top">
                {item.tools.map((t) => (
                  <li
                    key={t}
                    className="px-2 py-1 rounded bg-white/10 border border-white/10 text-white/80 text-xs"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {item.languages?.length ? (
            <div className="text-sm">
              <span className="inline-block w-16 text-white/50 align-top">Lang</span>
              <ul className="inline-flex flex-wrap gap-2 align-top">
                {item.languages.map((l) => (
                  <li
                    key={l}
                    className="px-2 py-1 rounded bg-white/10 border border-white/10 text-white/80 text-xs"
                  >
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {/* 説明 */}
      {item.description && (
        <p className="text-white/85 leading-relaxed whitespace-pre-wrap">
          {item.description}
        </p>
      )}
    </article>
  )}
</div>

      </div>

      {/* 追加CSS（グローバル） */}
      <style jsx global>{`
        /* 本体のスクロールロック */
        .modal-open, .modal-open body { overflow: hidden; }

        /* カーテンの開閉（左→右） */
        .curtain-in {
          animation: curtainIn var(--t) cubic-bezier(.22,.61,.36,1) forwards;
        }
        .curtain-out {
          animation: curtainOut var(--t) cubic-bezier(.22,.61,.36,1) forwards;
        }
        @keyframes curtainIn {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(0%); }
        }
        @keyframes curtainOut {
          0%   { transform: translateX(0%); }
          100% { transform: translateX(-100%); }
        }

        /* 中身のフェード */
        .content-in  { animation: contentIn  var(--t) ease forwards; animation-delay: 60ms; }
        .content-out { animation: contentOut var(--t) ease forwards; }
        @keyframes contentIn {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes contentOut {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(6px); }
        }
      `}</style>
    </div>
  );
}
