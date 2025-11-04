"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import Footer from "../components/Footer";

/**
 * SkillSection
 * - 各ブロックの画像が2~3枚のスライドショーで切り替わるように改良。
 * - 数秒ごとに自動で次の画像へフェード。
 */

// 各スキルのデータ
const SKILLS: Array<{
  id: string;
  num: string;
  title: string;
  tagJa: string;
  body: string;
  imgs: string[]; // 複数画像
}> = [
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
      "GSAPやThree.jsを用いたWebGLアニメーションの実装、ローダーやテキストへの動きを取り入れたUI／UX演出を設計。FigmaデザインをReactコンポーネントとして忠実に再現できます。実務でのReactフロントエンド開発経験を活かし、UI／UXを重視したサイトの設計・実装が可能です。",
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

// 単一ブロック内のスライドショー画像コンポーネント
function SlideShow({ imgs }: { imgs: string[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % imgs.length);
    }, 4000); // 4秒ごと切替
    return () => clearInterval(timer);
  }, [imgs.length]);

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 shadow-2xl">
      {imgs.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt="skill image"
          fill
          sizes="(min-width: 1024px) 560px, 90vw"
          className={`object-cover transition-opacity duration-1000 ${i === index ? "opacity-100" : "opacity-0"}`}
        />
      ))}
    </div>
  );
}

export default function SkillSection() {
  return (
    <section id="skill" className="relative w-full bg-[#121314] text-white">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:px-10 lg:py-24">
        <header className="mb-14 md:mb-20">
          <p className="mb-2 text-sm tracking-[0.18em] text-gray-300">スキル詳細</p>
          <h2 className="text-5xl font-extrabold tracking-tight md:text-6xl">
            <span className="[text-shadow:_0_0_16px_rgba(109,50,194,.25)]">Skill</span>
          </h2>
        </header>

        <div className="space-y-20 md:space-y-28">
          {SKILLS.map((item, i) => {
            const isEven = i % 2 === 1;
            return (
              <article
                key={item.id}
                className="grid items-center gap-8 md:grid-cols-2 md:gap-10 lg:gap-14"
              >
                <div className={isEven ? "md:order-2" : ""}>
                  <SlideShow imgs={item.imgs} />
                </div>

                <div className={isEven ? "md:order-1" : ""}>
                  <div className="mb-4 flex items-baseline gap-4 md:mb-5">
                    <span className="font-[100] tracking-widest text-gray-300/90">
                      <span className="neon-cyan text-3xl md:text-4xl">{item.num}</span>
                    </span>
                    <h3 className="text-3xl font-bold md:text-4xl">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mb-3 text-xs font-semibold tracking-wider text-[#6D32C2] md:text-sm">
                    {item.tagJa}
                  </p>
                  <p className="max-w-[54ch] leading-8 text-gray-200/95">{item.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(60%_60%_at_50%_20%,black,transparent)]"
        style={{
          background:
            "radial-gradient(40% 30% at 20% 10%, rgba(44,205,185,.18), transparent 70%), radial-gradient(30% 25% at 80% 15%, rgba(109,50,194,.16), transparent 70%)",
        }}
      />
      <Footer/>
    </section>
  );
}
