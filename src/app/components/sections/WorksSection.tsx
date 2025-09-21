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
    borderClasses: string;
  }> => [
    {
      key: "graphic",
      label: "Graphic",
      accentClass: "text-teal-300",
      direction: "right",
      speed: speedGraphic,
      itemWidth: cardW,
      gap,
       borderClasses:
      // 太めの枠＋ホバーで少し明るく＆仄かにグロー
      "border-2 border-teal-400/40 group-hover:border-teal-300/80 " +
      "ring-0 group-hover:ring-4 group-hover:ring-teal-300/20",
      items: [
        {
          src: "/works/graphic1.png",
          title: "名刺作成",
          subtitle: "名刺作成",          // 作品全体のサブタイトル（任意）
          description: "全体の説明（フォールバック）",
          tools: ["Illustrator"],
          period: "2024.11",
          kind: "graphic",
          images: [
          { src: "/works/graphic1.png",  desc: "Illustratorによる名刺制作。"},
          ],
        },
        {
          src: "/works/graphic2.png",
          title: "COWCOW BARGER",
          subtitle: "ロゴ制作　クライアントワーク",          // 作品全体のサブタイトル（任意）
          description: "全体の説明（フォールバック）",
          tools: ["Illustrator","Photoshop"],
          period: "2024.12",
          kind: "graphic",
          images: [
          { src: "/works/graphic2.png",   desc: "ハンバーガー屋さんのロゴ制作。",   subtitle: "クライアントワーク" },
          { src: "/works/graphic2-1.png", desc: "企画書の作成" },
          { src: "/works/graphic2-2.png", desc: "バリエーション" },
          { src: "/works/graphic2-3.png", desc: "使用例１"},
          { src: "/works/graphic2-4.png", desc: "使用例２" },
          ],
        },
        {
          src: "/works/graphic3.png",
          title: "彩の森　Dog Run Party",
          subtitle: "ポスター　リデザイン",          // 作品全体のサブタイトル（任意）
          description: "全体の説明（フォールバック）",
          tools: ["Illustrator","Photoshop"],
          period: "2025.01",
          kind: "graphic",
          images: [
          { src: "/works/graphic3.png",   desc: "彩の森公園イベントポスターのリデザイン" },
          { src: "/works/graphic3-1.png", desc: "元の写真" }
          ],
        },
        {
          src: "/works/graphic4.png",
          title: "Spece Kelvin",
          subtitle: "広告物作成",          // 作品全体のサブタイトル（任意）
          description: "",
          tools: ["Illustrator","Photoshop"],
          period: "2025.02",
          kind: "graphic",
          images: [
          { src: "/works/graphic4.png",   desc: "宇宙をテーマとしたアイス屋さんの広告物作成",   subtitle: "架空店" },
          { src: "/works/graphic4-1.png", desc: "企画書作成" },
          { src: "/works/graphic4-2.png", desc: "ロゴの制作" },
          { src: "/works/graphic4-3.png", desc: "ポスター作成" },
          ],
        },
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
      borderClasses:
      "border-2 border-purple-400/40 group-hover:border-purple-300/80 " +
      "ring-0 group-hover:ring-4 group-hover:ring-purple-300/20",
      items: [
        {
          src: "/works/web1.png",
          title: "デジリグHP （課題）",
          subtitle: "広告物作成",          // 作品全体のサブタイトル（任意）
          description: "",
          tools: ["Figma"],
          period: "2025.04",
          kind: "web",
          link: "https://www.figma.com/design/4u1f7qzDBmwDh2kvIfOXa5/LIG?node-id=0-1&t=aAxCldnMJRNgwzyQ-1",
          images: [
          { src: "/works/web1.png",   desc: "FigmaによるデジリグHPのデザイン作成"},
          { src: "/works/web1-1.png", desc: "FigmaによるデジリグHPのデザイン作成" },
          ],
        },
        {
          src: "/works/web2.png",
          title: "ネイルサロン　BB",
          subtitle: "Web作成",          // 作品全体のサブタイトル（任意）
          description: "",
          tools: ["Illustrator", "Figma", "React", "TypeScript"],
          period: "2025.06〜2025.07",
          kind: "web",
          link: "https://nail-salon-gsnvip9rj-riku10969s-projects.vercel.app/",
          images: [
          { src: "/works/web2.png",   desc: "フェミニンをベースとしたネイルサロンBBのデザイン、サイト作成"},
          { src: "/works/web2-1.png", desc: "お店のコンセプト、ターゲットなどをヒアリングして企画書の作成" },
          { src: "/works/web2-2.png", desc: "Illustratorでロゴの作成" },
          { src: "/works/web2-3.png", desc: "FigmaによるHPのデザイン作成" },
          { src: "/works/web2-4.png", desc: "React、TypeScriptでのHP作成" },
          ],
        },
        {
          src: "/works/web3.png",
          title: "ポートフォリオ",
          subtitle: "Web作成",  
          description: "本サイト",
          languages: ["React","TypeScript", "Three.js","GSAP","Next.js","WebGL","TailWindCss"],
          period: "2025.08〜",
          kind: "web",
          images: [
          { src: "/works/web3.png",   desc: "React Next.jsによるポートフォリオ作成"},
          { src: "/works/web3-1.png", desc: "Figmaによるデザイン作成。" },
          { src: "/works/web3-2.png", desc: "Three.js GSAP WEBGL TailWIndcssを使用し、アニメーションなどの実装" },
          ],
        },
      ],
    },
  ], [cardW, gap, speedGraphic, speedWeb]);

  // モーダル制御
  const [open, setOpen] = useState(false);
  const [currentKey, setCurrentKey] = useState<SectionKey | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const getSection = useCallback((key: SectionKey | null) => {
    if (!key) return null;
    return sections.find(s => s.key === key) ?? null;
  }, [sections]);

  const clampIndex = useCallback((idx: number, len: number) => {
    // 正のmod
    return ((idx % len) + len) % len;
  }, []);

  const resolveCurrentItem = useCallback((): WorkItem | null => {
    const sec = getSection(currentKey);
    if (!sec || sec.items.length === 0) return null;
    const safeIndex = clampIndex(currentIndex, sec.items.length);
    return sec.items[safeIndex];
  }, [currentKey, currentIndex, getSection, clampIndex]);

  const handleOpen = useCallback((key: SectionKey) => (index: number) => {
    setCurrentKey(key);
    setCurrentIndex(index);
    setOpen(true);
  }, []);

  // ← / → で同セクション内の前後アイテムに切替（カーテン内の内容が切り替わる）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const sec = getSection(currentKey);
      if (!sec) return;
      if (e.key === "ArrowRight") {
        setCurrentIndex((i) => clampIndex(i + 1, sec.items.length));
      } else if (e.key === "ArrowLeft") {
        setCurrentIndex((i) => clampIndex(i - 1, sec.items.length));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, currentKey, getSection, clampIndex]);

  return (
    <section className="bg-[#1f1f1f] text-white py-16">
      <span className="font-display">
      <h2 className="text-center mb-10">
        <FadeInText
          text="Works"
          from="right"
          stagger={0.08}
          baseDelay={0.3}
          className="text-4xl md:text-5xl font-display"
        />
      </h2>
      </span>

      {sections.map((sec) => {
        const images = sec.items.map(i => i.src);
        return (
          <div key={sec.key} className="mb-12">
            <h3 className={`${sec.accentClass} text-5xl font-serif ml-6 mb-5`}>
              <FadeInText
                text={sec.label}
                from="left"
                stagger={0.08}
                baseDelay={0.3}
                className="text-4xl md:text-5xl font-display"
              />
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
                  className="group relative block focus:outline-none my-4"
                  style={{ width }}
                >
                  <div
        className={
          // ここを変更：既存のカードクラスに sec.borderClasses を追加
          "relative rounded-2xl bg-[#121212] overflow-hidden shadow-lg " +
          "transition-transform duration-300 group-hover:scale-[1.04] " +
          sec.borderClasses           // ←強めの枠＆ホバー演出
        }
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
