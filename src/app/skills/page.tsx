"use client";

import Image from "next/image";
import React, { useEffect, useState, useRef } from "react";
import Footer from "../components/Footer";
import SkillScene3D from "../components/canvas/SkillScene3D";

/* ----------------------------------------------------
   SKILL データ
---------------------------------------------------- */
const SKILLS = [
  {
    id: "branding",
    num: "01",
    title: "Branding",
    tagJa: "ブランディング",
    body:
      "ヒアリングからコンセプト設計、配色・タイポ・ビジュアルデザインまで、Web・ロゴ制作をトータルに対応。企画書やモックアップで具体的な提案が可能です。",
    imgs: ["/skill/branding1.jpg", "/skill/branding2.jpg", "/skill/branding3.jpg"],
  },
  {
    id: "design",
    num: "02",
    title: "Design",
    tagJa: "デザイン",
    body:
      "Illustrator・Photoshop・Figmaなどのデザインツールを活用し、ロゴやポスター制作、写真加工、Web UIデザインまで幅広く対応可能です。",
    imgs: ["/skill/design1.jpg", "/skill/design2.jpg", "/skill/design3.jpg"],
  },
  {
    id: "frontend",
    num: "03",
    title: "FrontEnd",
    tagJa: "フロントエンド開発",
    body:
      "GSAPやThree.jsを用いたWebGLアニメーションの実装、ローダーやテキストへの動きを取り入れたUI／UX演出を設計。FigmaデザインをReactコンポーネントとして忠実に再現できます。",
    imgs: ["/skill/frontend1.jpg", "/skill/frontend2.jpg"],
  },
  {
    id: "subskill",
    num: "04",
    title: "SubSkill",
    tagJa: "補助スキル",
    body:
      "VBAを活用した業務効率化ツールの開発経験があり、Gitを用いたバージョン管理にも対応できます。",
    imgs: ["/skill/subskill1.jpg", "/skill/subskill2.jpg"],
  },
];

/* ----------------------------------------------------
   SlideShow（シンプルな opacity 切り替えのみ）
---------------------------------------------------- */
function SlideShow({ imgs }: { imgs: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (imgs.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % imgs.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [imgs.length]);

  return (
    <div
      className="
        relative w-full
        h-[220px] md:h-[280px] lg:h-[340px]
        overflow-hidden rounded-2xl
        bg-black/50
        ring-1 ring-white/15 shadow-2xl
      "
    >
      {imgs.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt="skill image"
          fill
          sizes="(min-width:1024px) 50vw, 100vw"
          className={`
            object-cover object-center
            transition-opacity duration-700
            ${i === index ? "opacity-100" : "opacity-0"}
          `}
        />
      ))}
    </div>
  );
}

/** スクロール進行 0..1 にイージング（easeOutCubic） */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
}

export default function SkillSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const onScroll = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight;
        const sectionHeight = section.offsetHeight;
        // セクションがビューポートを「通過」する割合で 0..1（上端が画面下端を超えた分 / セクション高さ）
        const raw =
          sectionHeight <= 0 ? 0 : Math.max(0, Math.min(1, (vh - rect.top) / (sectionHeight + vh)));
        const eased = easeOutCubic(raw);
        progressRef.current = eased;
        setScrollProgress(eased);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="skill"
      className="relative w-full min-h-screen bg-[#0b0b0c] text-white font-sans"
    >
      {/* Three.js 背景（スクロール連動カメラ） */}
      <SkillScene3D scrollProgress={scrollProgress} />

      {/* DOM コンテンツ：常に前面・可読性優先 */}
      <div className="relative z-10 mx-auto max-w-6xl px-5 py-20 md:px-8 lg:px-10 lg:py-28">
        <header className="mb-16 md:mb-24">
          <p className="mb-2 text-xs font-medium tracking-[0.2em] text-white/50 uppercase">
            Skill Detail
          </p>
          <h2 className="font-serif text-5xl font-semibold tracking-wide md:text-6xl lg:text-7xl">
            <span className="text-white [text-shadow:_0_0_24px_rgba(44,205,185,.2)]">Skill</span>
          </h2>
        </header>

        <div className="space-y-24 md:space-y-32">
          {SKILLS.map((item, index) => {
            const isEven = index % 2 === 1;

            return (
              <article
                key={item.id}
                className="grid items-center gap-12 md:grid-cols-2 md:gap-16"
              >
                <div className={isEven ? "md:order-2" : ""}>
                  <SlideShow imgs={item.imgs} />
                </div>

                <div className={isEven ? "md:order-1" : ""}>
                  <div className="mb-6 flex items-baseline gap-4">
                    <span className="font-[100] tracking-widest text-gray-300/90">
                      <span className="neon-cyan text-4xl md:text-5xl">{item.num}</span>
                    </span>
                    <h3 className="font-serif text-3xl font-semibold tracking-wide md:text-4xl lg:text-5xl">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mb-5 text-sm font-medium tracking-wider text-[#A855F7]/90 md:text-base">
                    {item.tagJa}
                  </p>
                  <p className="max-w-[58ch] font-serif text-sm leading-relaxed text-white/90 md:text-base md:leading-9 lg:text-lg">
                    {item.body}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <Footer />
    </section>
  );
}
