"use client";
import { useRef, useState, useEffect } from "react";

type Props = {
  title?: string; // ボタンの表示文言
  children: React.ReactNode; // 詳細の中身（自由に差し替え可）
  defaultOpen?: boolean;
};

export default function AboutDetailsAccordion({
  title = "About 詳細をひらく",
  children,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [maxH, setMaxH] = useState<number>(0);

  // コンテンツ高さを測ってアニメに利用
  useEffect(() => {
    if (!panelRef.current) return;
    setMaxH(panelRef.current.scrollHeight);
  }, [children]);

  return (
    <div className="mt-10">
      {/* トグルボタン */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="about-details-panel"
        className="group inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm md:text-base
                   transition-[transform,background-color,border-color] hover:bg-white/10 active:scale-[0.98]"
      >
        {/* アイコン（＋／−） */}
        <span
          className={`grid h-5 w-5 place-items-center rounded-md border border-white/25 transition-transform
                     ${open ? "rotate-180" : "rotate-0"}`}
          aria-hidden
        >
          {/* 角丸の＋っぽい記号 */}
          <span className="block leading-none text-xs">＋</span>
        </span>
        <span className="tracking-wide">{open ? "About 詳細をとじる" : title}</span>
      </button>

      {/* 開閉パネル */}
      <div
        id="about-details-panel"
        role="region"
        aria-label="About 詳細"
        className="overflow-hidden transition-[max-height] duration-500 ease-in-out"
        style={{ maxHeight: open ? maxH : 0 }}
      >
        <div ref={panelRef} className="pt-6">
          <div className="rounded-xl border border-white/10 bg-[#17181c]/80 p-5 md:p-6 text-[14px] md:text-[15px] leading-7 text-[#d6d8de]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
