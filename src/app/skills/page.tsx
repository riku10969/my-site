"use client";

import Image from "next/image";
import React, { useEffect, useState, useRef } from "react";
import Footer from "../components/Footer";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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
   SlideShow
   - 画像切り替えはシンプルに CSS の opacity トランジション
   - 画像はコンテナいっぱいに object-cover でフィット
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
        overflow-hidden rounded-3xl
        bg-black/60
        ring-1 ring-white/10 shadow-2xl
        js-media
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

/* ----------------------------------------------------
   SkillSection 本体
   - GSAP はスクロール連動（カード＆テキスト）だけに使用
---------------------------------------------------- */
export default function SkillSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      // ヘッダー出現
      gsap.from(".js-skill-header", {
        opacity: 0,
        y: 60,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".js-skill-header",
          start: "top 85%",
        },
      });

      const cards = gsap.utils.toArray<HTMLElement>(".js-skill-card");

      const patterns = [
        {
          mediaFrom: { opacity: 0, y: 120, scale: 1.05 },
          mediaTo: { opacity: 1, y: 0, scale: 1, duration: 1, ease: "power3.out" },
          cardFrom: { opacity: 0, y: 80 },
          cardTo: { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" },
        },
        {
          mediaFrom: { opacity: 0, x: -140, scale: 1.03 },
          mediaTo: { opacity: 1, x: 0, scale: 1, duration: 1, ease: "power3.out" },
          cardFrom: { opacity: 0, x: -80 },
          cardTo: { opacity: 1, x: 0, duration: 0.9, ease: "power3.out" },
        },
        {
          mediaFrom: { opacity: 0, x: 140, scale: 1.03 },
          mediaTo: { opacity: 1, x: 0, scale: 1, duration: 1, ease: "power3.out" },
          cardFrom: { opacity: 0, x: 80 },
          cardTo: { opacity: 1, x: 0, duration: 0.9, ease: "power3.out" },
        },
      ];

      cards.forEach((card, index) => {
        const media = card.querySelector(".js-media");
        const texts = card.querySelectorAll(".js-skill-text");
        const effect = patterns[index % patterns.length];

        // カード全体の出現／フェードアウト（逆再生）
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            end: "top 30%",
            toggleActions: "play reverse play reverse",
          },
        });

        tl.fromTo(card, effect.cardFrom, effect.cardTo);

        if (media) {
          tl.fromTo(media, effect.mediaFrom, effect.mediaTo, "-=0.6");
        }

        // テキストは少し遅れてバラ出し
        if (texts.length) {
          gsap.from(texts, {
            opacity: 0,
            y: 40,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.1,
            scrollTrigger: {
              trigger: card,
              start: "top 80%",
            },
          });
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="skill"
      className="relative w-full bg-[#121314] text-white"
    >
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:px-10 lg:py-24">
        {/* ヘッダー */}
        <header className="mb-14 md:mb-20 js-skill-header">
          <h2 className="text-5xl font-extrabold tracking-tight md:text-6xl">
            <span className="[text-shadow:_0_0_16px_rgba(109,50,194,.25)]">
              Skill
            </span>
          </h2>
          <p className="mb-2 text-sm tracking-[0.18em] text-gray-300">
            スキル詳細
          </p>
        </header>

        <div className="space-y-20 md:space-y-28">
          {SKILLS.map((item, index) => {
            const isEven = index % 2 === 1;

            return (
              <article
                key={item.id}
                className="js-skill-card grid items-center gap-10 md:grid-cols-2"
              >
                <div className={isEven ? "md:order-2" : ""}>
                  <SlideShow imgs={item.imgs} />
                </div>

                <div className={isEven ? "md:order-1" : ""}>
                  <div className="mb-5 flex items-center gap-4 js-skill-text">
                    <span className="font-[100] tracking-widest text-gray-300/90">
                      <span className="neon-cyan text-4xl md:text-5xl">
                        {item.num}
                      </span>
                    </span>
                    <h3 className="text-3xl font-bold md:text-4xl lg:text-5xl">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mb-4 text-sm font-semibold tracking-wider text-[#6D32C2] md:text-base js-skill-text">
                    {item.tagJa}
                  </p>
                  <p className="max-w-[60ch] text-sm leading-8 text-gray-200/95 md:text-base md:leading-9 lg:text-lg js-skill-text">
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
