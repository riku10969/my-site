"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

type WorkItem = {
  src: string;
  title: string;
  description: string;
  tools?: string[];        // 使用ツール（Figma/Illustrator/Photoshop など）
  languages?: string[];    // 使用言語/技術（TS/React/Tailwind など）
  period?: string;         // 作成期間（共通）
  periodDesign?: string;   // Web: デザイン期間
  periodCoding?: string;   // Web: コーディング期間
  kind: "graphic" | "web"; // 種別
};

/** ▼ サンプル：ここをりく様の実データに差し替え */
const worksGraphic: WorkItem[] = [
  {
    src: "/works/graphic1.png",
    title: "Poster Design – Noir",
    description: "映画告知を想定したタイポグラフィ主体のポスター。",
    tools: ["Illustrator", "Photoshop"],
    languages: [],
    period: "2025/04（約1週間）",
    kind: "graphic",
  },
  {
    src: "/works/graphic2.png",
    title: "Brand Logo – Bloom",
    description: "ネイルサロンのブランドロゴ提案。曲線と余白で上品さを表現。",
    tools: ["Illustrator"],
    languages: [],
    period: "2025/03（4日）",
    kind: "graphic",
  },
];

const worksWeb: WorkItem[] = [
  {
    src: "/works/web1.png",
    title: "UI/UX Portfolio",
    description: "自身のポートフォリオサイト。GSAP/Three.jsで動きのある体験を設計。",
    tools: ["Figma"],
    languages: ["Next.js", "TypeScript", "Tailwind", "GSAP"],
    periodDesign: "2025/05（10日）",
    periodCoding: "2025/05（2週間）",
    kind: "web",
  },
  {
    src: "/works/web2.png",
    title: "EC Landing Page",
    description: "新規ECサービスのLP。ファーストビュー最適化と軽量化を両立。",
    tools: ["Figma"],
    languages: ["React", "TypeScript", "Tailwind"],
    periodDesign: "2025/02（5日）",
    periodCoding: "2025/02（6日）",
    kind: "web",
  },
];

/** 無限左右スクロールのトラック */
function InfiniteMarquee({
  items,
  direction = "right",
  onItemClick,
  thumbWidth = 320,
  thumbHeight = 200,
}: {
  items: WorkItem[];
  direction?: "left" | "right";
  onItemClick: (index: number) => void;
  thumbWidth?: number;
  thumbHeight?: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const laneRef = useRef<HTMLDivElement | null>(null);

  // 2倍にしてシームレス化
  const doubled = useMemo(() => [...items, ...items], [items]);

  useEffect(() => {
    const lane = laneRef.current;
    const wrap = wrapRef.current;
    if (!lane || !wrap) return;

    // レーンの実幅（半分で1ループ）
    const halfWidth = lane.scrollWidth / 2;

    const tween = gsap.to(lane, {
      x: direction === "right" ? -halfWidth : halfWidth,
      duration: 20,          // 速度はここで調整
      ease: "linear",
      repeat: -1,
    });

    // リサイズで速度/距離を再計算
    const handle = () => {
      tween.pause(0);
      const newHalf = lane.scrollWidth / 2;
      tween.vars.x = direction === "right" ? -newHalf : newHalf;
      tween.play(0);
    };
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("resize", handle);
      tween.kill();
    };
  }, [direction]);

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden">
      <div ref={laneRef} className="flex will-change-transform">
        {doubled.map((item, i) => (
          <button
            key={`${item.src}-${i}`}
            className="mx-2 shrink-0 focus:outline-none"
            style={{ minWidth: thumbWidth }}
            onClick={() => onItemClick(i % items.length)}
            aria-label={`${item.title} を拡大表示`}
          >
            <Image
  src={item.src}
  alt={item.title}
  width={320}
  height={200}
  className="rounded-lg shadow-lg object-cover"
/>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function WorksSection() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  // Lightbox に渡す全スライド（Graphic → Web の順）
  const slides: WorkItem[] = useMemo(
    () => [...worksGraphic, ...worksWeb],
    []
  );

  // クリック位置から正しいインデックスに変換
  const handleClickGraphic = (i: number) => {
    setIndex(i); // Graphic は 0 始まり
    setOpen(true);
  };
  const handleClickWeb = (i: number) => {
    setIndex(worksGraphic.length + i);
    setOpen(true);
  };

  const lightboxSlides = slides.map((w, i) => ({
  src: w.src,
  title: w.title,
  description: w.description,
  metaIndex: i, // ← これで w を確実に特定
}));

  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Works</h1>
      <p style={{ color: "#bfc5d1", lineHeight: 1.8 }}>
        デザイン＆Webの制作物。サムネイルをクリックすると拡大＋詳細（タイトル／説明／使用ツール＆言語／作成期間）が表示されます。
      </p>

      {/* Graphic（右方向へ流れる） */}
      <h2 className="text-teal-400 mt-10 mb-4 font-semibold">Graphic</h2>
      <InfiniteMarquee
        items={worksGraphic}
        direction="right"
        onItemClick={handleClickGraphic}
      />

      {/* Web（左方向へ流れる） */}
      <h2 className="text-purple-400 mt-12 mb-4 font-semibold">Web</h2>
      <InfiniteMarquee
        items={worksWeb}
        direction="left"
        onItemClick={handleClickWeb}
      />



<Lightbox
  open={open}
  close={() => setOpen(false)}
  index={index}
  slides={lightboxSlides}
  render={{
    slide: ({ slide }) => (
      <div
        style={{
          width: "min(90vw, 1200px)",
          height: "min(80vh, 720px)",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <img
          src={String(slide.src)}
          alt={String((slide as any).title ?? "")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain", // → 余白OKで全体表示（切り抜きたくない場合）
            // objectFit: "cover", // → 常に同じ大きさに見せたい（多少トリミングOK）
          }}
        />
      </div>
    ),
    // ▼ v2 系はこちら
    slideFooter: ({ slide }) => {
      const idx = (slide as any)?.metaIndex ?? 0;
      const w = slides[idx];
      if (!w) return null;
      const hasWebSplit = !!(w.periodDesign || w.periodCoding);

      return (
        <div style={{ width:"100%", maxWidth:960, margin:"0 auto", padding:"14px 18px", lineHeight:1.6 }}>
          <div style={{ fontWeight:800, fontSize:18, marginBottom:6 }}>{w.title}</div>
          <div style={{ opacity:0.9, marginBottom:10 }}>{w.description}</div>

          <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:6 }}>
            {(w.tools?.length ?? 0) > 0 && (
              <div><span style={{ opacity:.7, marginRight:6 }}>Tools:</span>{w.tools!.join(" / ")}</div>
            )}
            {(w.languages?.length ?? 0) > 0 && (
              <div><span style={{ opacity:.7, marginRight:6 }}>Lang/Tech:</span>{w.languages!.join(" / ")}</div>
            )}
          </div>

          <div>
            {hasWebSplit ? (
              <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                {w.periodDesign && (<div><span style={{ opacity:.7, marginRight:6 }}>Period (Design):</span>{w.periodDesign}</div>)}
                {w.periodCoding && (<div><span style={{ opacity:.7, marginRight:6 }}>Period (Coding):</span>{w.periodCoding}</div>)}
              </div>
            ) : (
              w.period && (<div><span style={{ opacity:.7, marginRight:6 }}>Period:</span>{w.period}</div>)
            )}
          </div>
        </div>
      );
    },
  }}
/>

    </section>
  );
}
