"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import GlitchText from "../ui/GlitchText";
import StrengthParallax from "../gsap/StrengthParallax";
import SkillBarsAbout from "./SkillBarsAbout";
import HobbySection from "./HobbySection";

gsap.registerPlugin(ScrollTrigger);

export default function AboutSection({ isLoaded = true }: { isLoaded?: boolean }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLDivElement | null>(null);
  const [imgWarpOn, setImgWarpOn] = useState(false);

  // 画像が一度だけ画面に入ったら歪み演出ON
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImgWarpOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ヒーロー（写真＋プロフィール）の軽いパララックス
  useEffect(() => {
    const hero = heroRef.current;
    const section = sectionRef.current;
    if (!hero || !section) return;

    const mm = gsap.matchMedia();

    // 動きを減らす設定では何も作らない（条件が match しなければコールバックは走らない）
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        hero,
        { y: 0 },
        {
          y: -60,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top 50%",
            end: () => `+=${window.innerHeight * 2}`,
            scrub: true,
            invalidateOnRefresh: true,
          },
        }
      );
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#121316] text-white max-md:overflow-x-clip"
    >
      <div className="w-full max-w-[1600px] mx-auto px-6 md:px-10 lg:px-14 pt-24 pb-14">
        {/* ===============================
            左右レイアウト: 写真（左） + 名前・プロフィール（右）
           =============================== */}
        <div
          ref={heroRef}
          className="flex flex-col md:flex-row md:items-start md:gap-10 lg:gap-14"
        >
          {/* 左: 写真 */}
          <div className="w-full md:flex-shrink-0 md:w-[50%] lg:w-[48%] max-md:mx-auto max-md:w-[80%]">
            <div
              ref={imgRef}
              className={[
                "warp-image",
                "w-full rounded-xl overflow-hidden bg-[#e9ebee]",
                "h-[260px] sm:h-[320px] md:h-[440px] lg:h-[540px]",
                imgWarpOn ? "warp-on" : "",
              ].join(" ")}
              style={
                {
                  ["--img" as string]: "url(/projects/project1.webp)",
                } as React.CSSProperties
              }
              aria-label="About visual"
              role="img"
            />
          </div>

          {/* 右: 名前・肩書き・プロフィール */}
          <div className="flex flex-col md:flex-1 md:min-w-0 max-md:items-center max-md:mt-6 pt-8 md:pt-14 lg:pt-20">
            <GlitchText
              key={`imgname-${isLoaded ? "on" : "off"}`}
              as="div"
              text="Riku Ohashi"
              delaySec={0.55}
              className="font-serif text-[44px] md:text-[50px] tracking-[0.12em] max-md:text-[clamp(26px,7.5vw,36px)] max-md:tracking-[0.04em] text-white/90"
              trigger="scroll"
              armed={isLoaded}
            />

            <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-2 gap-y-1.5 mt-2 max-md:mt-1.5 max-md:px-2">
              <span className="text-sm text-white/80 max-md:text-[13px]">
                Frontend Engineer / UIUX
              </span>
            </div>

            {/* プロフィール（右カラム内） */}
            <div className="max-md:px-1 mt-8 md:mt-10">
              <h2 className="text-[20px] md:text-[22px] font-semibold">
                <GlitchText
                  key={`profile-${isLoaded ? "on" : "off"}`}
                  as="span"
                  text="大橋 陸　1999年生まれ、埼玉県出身"
                  delaySec={1}
                  trigger="scroll"
                  armed={isLoaded}
                />
              </h2>

              <p className="mt-4 px-2 sm:px-0 text-[15px] sm:text-[17px] md:text-[20px] leading-7 sm:leading-8 md:leading-8 text-[#d6d8de] max-w-[1100px] max-md:text-[15px] max-md:leading-[1.8] max-md:px-5">
                高校卒業後、職人として現場で働いた経験から、丁寧さと粘り強さを大切にする姿勢を培いました。
                その後、フロントエンドエンジニアとして実務を経験し、Reactを中心にWebサイトの開発を担当。
                デジリグに入校してデザインを体系的に学び、現在は
                <strong className="text-white">「デザイン × 実装」</strong>
                の両面から提案することが可能です。
                ユーザーにとって直感的で心地よい体験を生み出すことを目指しています。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Strength（全画面パララックス）。pin の高さは pin-spacer が確保する */}
      <StrengthParallax isLoaded={isLoaded} />

      {/* ===============================
          Skill / Hobby
          Strength は unpin 後にセクションごと上へ流れて退場するので、
          ここで大きな余白を取ると「何もない画面」が伸びる
         =============================== */}
      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 lg:px-14 bg-[#121316] pb-10 md:pb-14">
        <div id="about-skill-section" className="mt-6 md:mt-10">
          <SkillBarsAbout />
        </div>

        <div className="mt-8 md:mt-12">
          <HobbySection
            items={[
              {
                src: "/hobby/figaro.webp",
                alt: "Figaro",
                label: "フィガロ",
                description: "チワワとペキニーズのミックス犬。毎日の癒しです。",
                category: "Figaro",
              },
              {
                src: "/hobby/camera.webp",
                alt: "Photography",
                label: "写真",
                description: "最近はデジカメにハマってます。",
                category: "PHOTOGRAPHY",
              },
              {
                src: "/hobby/movie1.webp",
                alt: "Cinema",
                label: "映画",
                description: "休日は映画館で映画をよく観ています。",
                category: "CINEMA",
              },
              {
                src: "/hobby/snow.webp",
                alt: "Snow Trip",
                label: "スノーボード",
                description: "唯一の体を動かす趣味です。",
                category: "SNOWBOARD",
              },
              {
                src: "/hobby/car.webp",
                alt: "Car",
                label: "CIVIC",
                description: "車の運転が得意です。",
                category: "CIVIC",
              },
              {
                src: "/hobby/NewYork.webp",
                alt: "NewYork",
                label: "ニューヨーク",
                description: "海外のデザインやサイトを見て勉強しています。",
                category: "TRAVEL",
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
