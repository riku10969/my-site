"use client";

import React, { useEffect, useRef, useState } from "react";
import GlitchText from "../ui/GlitchText";
import CharReveal from "../gsap/CharReveal";
import { useHeroBandParallax } from "../gsap/HeroBandParallax";
import StrengthParallax from "../gsap/StrengthParallax";
import SkillBarsAbout from "./SkillBarsAbout";
import HobbySection from "./HobbySection";

export default function AboutSection({ isLoaded = true }: { isLoaded?: boolean }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const bandRef = useRef<HTMLDivElement | null>(null);
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

  // 帯の中の写真をゆっくり持ち上げる。実装は gsap/ に委譲
  useHeroBandParallax({ bandRef, imageRef: heroRef });

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#121316] text-white max-md:overflow-x-clip"
    >
      {/* ===============================
          ヒーロー：全幅の帯に写真、その上に名前を重ねる
         =============================== */}
      <div
        ref={bandRef}
        className="relative w-full overflow-hidden h-[300px] sm:h-[380px] md:h-[480px] lg:h-[560px]"
      >
        {/*
          帯より 20% 高くして上に逃がしてある。パララックスで持ち上げても
          下端に隙間ができないようにするため（yPercent なので帯の高さに追従する）。
        */}
        <div
          ref={heroRef}
          className="absolute inset-x-0 top-[-4%] h-[120%]"
        >
          <div
            ref={imgRef}
            className={[
              "warp-image w-full h-full bg-[#e9ebee]",
              imgWarpOn ? "warp-on" : "",
            ].join(" ")}
            style={
              {
                ["--img" as string]: "url(/projects/about-hero.webp)",
                // 1537x1023（比 1.50）。全幅の帯にすると縦が 4 割ほど切れるので、
                // 顔が帯の中央やや上に来る位置で切る（計算上の最適値は 47%）
                ["--img-pos" as string]: "center 47%",
              } as React.CSSProperties
            }
            aria-label="About visual"
            role="img"
          />
        </div>

        {/* 写真の上に名前。下端のグラデーションで文字を読みやすくする */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#121316] via-[#121316]/55 to-transparent pt-20 pb-6 md:pb-10">
          <div className="w-full max-w-[1600px] mx-auto px-6 md:px-10 lg:px-14">
            <CharReveal
              as="div"
              text="Riku Ohashi"
              delay={0.15}
              className="font-serif text-[clamp(34px,9vw,50px)] md:text-[clamp(40px,5vw,68px)]
                         tracking-[0.12em] max-md:tracking-[0.04em] leading-none text-white
                         [text-shadow:_0_2px_16px_rgba(0,0,0,0.55)]"
            />
            <span className="mt-3 block text-sm md:text-base text-white/80">
              Frontend Engineer / UIUX
            </span>
          </div>
        </div>
      </div>

      {/* ===============================
          プロフィール（帯の下）
         =============================== */}
      <div className="w-full max-w-[1600px] mx-auto px-6 md:px-10 lg:px-14 pt-12 md:pt-16 pb-14">
        <h2 className="text-[20px] md:text-[22px] font-semibold">
          <GlitchText
            key={`profile-${isLoaded ? "on" : "off"}`}
            as="span"
            text="大橋 陸　1999年生まれ、埼玉県出身"
            delaySec={0.6}
            trigger="scroll"
            armed={isLoaded}
          />
        </h2>

        <p className="mt-4 text-[15px] sm:text-[17px] md:text-[20px] leading-7 sm:leading-8 md:leading-8 text-[#d6d8de] max-w-[1100px] max-md:text-[15px] max-md:leading-[1.8]">
          高校卒業後、職人として現場で働いた経験から、丁寧さと粘り強さを大切にする姿勢を培いました。
          その後、フロントエンドエンジニアとして実務を経験し、Reactを中心にWebサイトの開発を担当。
          デジリグに入校してデザインを体系的に学び、現在は
          <strong className="text-white">「デザイン × 実装」</strong>
          の両面から提案することが可能です。
          ユーザーにとって直感的で心地よい体験を生み出すことを目指しています。
        </p>
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
