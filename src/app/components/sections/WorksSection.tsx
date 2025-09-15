"use client";
import { useMemo, useState, useCallback, useEffect } from "react";
import InfiniteMarquee from "../InfiniteMarquee";
import CurtainModal, { WorkItem } from "../CurtainModal";
import FadeInText from "../FadeInText";

/** 画面幅でSP判定（Tailwindのsm相当 640px） */
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${breakpoint - 1}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);
  return isMobile;
}

type SectionKey = "graphic" | "web";

export default function Works() {
  const isMobile = useIsMobile(640);

  // PC/スマホでカード幅・ギャップ・速度（小さいほど速い）を切替
  const cardW = isMobile ? 140 : 240;
  const gap   = isMobile ? 16  : 32;
  const speedGraphic = isMobile ? 12 : 26; // s（duration）小さいほど速い
  const speedWeb     = isMobile ? 12 : 24;

  const sections = useMemo((): Array<{
    key: SectionKey;
    label: string;
    accentClass: string;
    direction: "left" | "right";
    speed: number;
    itemWidth: number;
    gap: number;
    items: WorkItem[];
  }> => [
    {
      key: "graphic",
      label: "Graphic",
      accentClass: "text-teal-300",
      direction: "right",
      speed: speedGraphic,
      itemWidth: cardW,
      gap,
      items: [
        { src: "/works/graphic1.png", title: "Poster A", description: "展示会用ポスターA案。", tools: ["Figma","Illustrator"], languages: [], period: "2025.04", kind: "graphic" },
        { src: "/works/graphic2.png", title: "Poster B", description: "写真合成を中心にしたB案。", tools: ["Photoshop"], languages: [], period: "2025.05", kind: "graphic" },
        { src: "/works/graphic3.png", title: "Poster C", description: "タイポ重視のC案。", tools: ["Figma","Photoshop"], languages: [], period: "2025.06", kind: "graphic" },
        { src: "/works/graphic4.png", title: "Space Kelvin", description: "POPタイポ＆ロゴ展開。", tools: ["Illustrator","Photoshop"], languages: [], period: "2025.06", kind: "graphic" },
      ],
    },
    {
      key: "web",
      label: "Web",
      accentClass: "text-purple-300",
      direction: "left",
      speed: speedWeb,
      itemWidth: cardW,
      gap,
      items: [
        { src: "/works/web1.png", title: "LP Design", description: "Next.js + Tailwind LP。", tools: ["Figma","Next.js","Tailwind"], languages: ["TypeScript","HTML","CSS"], period: "2025.02", kind: "web", link: "https://example.com/lp" },
        { src: "/works/web2.png", title: "Dashboard", description: "管理画面設計＆GSAP遷移。", tools: ["React","GSAP"], languages: ["TypeScript"], period: "2025.03", kind: "web", link: "https://example.com/dashboard" },
        { src: "/works/web3.png", title: "Portfolio", description: "3Dヒーロー演出のPF。", tools: ["Three.js","GSAP","Next.js"], languages: ["TypeScript"], period: "2025.07", kind: "web", link: "https://example.com/portfolio" },
      ],
    },
  ], [cardW, gap, speedGraphic, speedWeb]);

  // モーダル制御
  const [open, setOpen] = useState(false);
  const [currentKey, setCurrentKey] = useState<SectionKey | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const resolveCurrentItem = useCallback((): WorkItem | null => {
    if (!currentKey) return null;
    const sec = sections.find(s => s.key === currentKey);
    if (!sec || sec.items.length === 0) return null;
    const safeIndex = ((currentIndex % sec.items.length) + sec.items.length) % sec.items.length;
    return sec.items[safeIndex];
  }, [currentKey, currentIndex, sections]);

  const handleOpen = useCallback((key: SectionKey) => (index: number) => {
    setCurrentKey(key);
    setCurrentIndex(index);
    setOpen(true);
  }, []);

  return (
    <section className="bg-[#1f1f1f] text-white py-16">
      <h2 className="text-center mb-10">
        <FadeInText
          text="Works"
          from="right"
          stagger={0.08}
          baseDelay={0.3}
          className="text-4xl md:text-5xl font-serif"
        />
      </h2>

      {sections.map((sec) => {
        const images = sec.items.map(i => i.src);
        return (
          <div key={sec.key} className="mb-12">
            <h3 className={`${sec.accentClass} text-2xl font-semibold ml-6 mb-5`}>
              {sec.label}
            </h3>

            <InfiniteMarquee
              images={images}
              direction={sec.direction}
              speed={sec.speed}
              itemWidth={sec.itemWidth}
              gap={sec.gap}
              onItemClick={(idx) => handleOpen(sec.key)(idx)}
              renderItem={({ index, src, width, height, radius = 16, onClick }) => (
                // ホバーあり（拡大&タイトル帯）版
                <button
                  type="button"
                  onClick={onClick}
                  className="group relative block focus:outline-none"
                  style={{ width }}
                >
                  <div
                    className="relative rounded-2xl bg-[#121212] border border-white/10 overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-[1.04]"
                    style={{ width, height, borderRadius: radius }}
                  >
                    {/* 画像は外側で丸め、object-contain で中央に余白 */}
                    <img
                      src={src}
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain"
                      loading="lazy"
                      draggable={false}
                    />

                    {/* タイトル帯：ホバーでフェードイン（indexは元配列基準で安全に参照） */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="mx-2 mb-2 rounded-xl bg-black/55 backdrop-blur-sm px-3 py-2">
                        <p className="text-sm font-semibold leading-none">
                          {sec.items[index % sec.items.length]?.title ?? ""}
                        </p>
                        <p className="text-[11px] opacity-80 mt-1">
                          {(sec.items[index % sec.items.length]?.tools ?? []).join(", ")}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              )}
            />
          </div>
        );
      })}

      <CurtainModal
        open={open}
        item={resolveCurrentItem()}
        onRequestClose={() => setOpen(false)}
        duration={800}
      />
    </section>
  );
}
