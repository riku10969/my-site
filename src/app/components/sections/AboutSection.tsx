"use client";

import React, { useEffect, useRef, useState } from "react";
import GlitchText from "../GlitchText";
import SkillBarsAbout from "../SkillBarsAbout";
import HobbySection from "../HobbySection";
import AboutDetailsAccordion from "../AboutDetailsAccordion";
import StrengthBlock from "../StrengthBlock";

export default function AboutSection({ isLoaded }: { isLoaded: boolean }) {
  const imgRef = useRef<HTMLDivElement | null>(null);
  const [imgWarpOn, setImgWarpOn] = useState(false);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          // ✅ 1回だけ
          setImgWarpOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

   return (
    <section className="w-full bg-[#121316] text-white">
      <div className="w-full max-w-[1600px] mx-auto px-6 md:px-10 lg:px-14 pt-24 pb-14">
                 

          {/* ✅ デカい画像 + “ゆがみ”グリッチ（スクロールで1回のみ） + 下に名前 */}
          <div className="flex flex-col items-center">
            <div
              ref={imgRef}
              className={[
                "warp-image",
                "w-[80%] mx-auto", // ✅ 横幅80%（右カラム内）+ 中央寄せ
                "max-w-[1600px] rounded-xl overflow-hidden bg-[#e9ebee]",
                "h-[260px] sm:h-[320px] md:h-[520px] lg:h-[620px]",
                imgWarpOn ? "warp-on" : "",
              ].join(" ")}
              style={
                {
                  ["--img" as any]: "url(/projects/project1.jpg)",
                } as React.CSSProperties
              }
              aria-label="About visual"
              role="img"
            />

            {/* ✅ 画像の下に GlitchText（グリッチ消さない） */}
            <GlitchText
              key={`imgname-${isLoaded ? "on" : "off"}`}
              as="div"
              text="Riku Ohashi"
              delaySec={0.55}
              className="font-serif mt-4 text-[50x] md:text-[50px] tracking-[0.12em] text-white/90"
              trigger="scroll"
              armed={isLoaded}
            />
          </div>
      
        {/* 以下そのまま */}
        <h2 className="mt-12 text-[20px] md:text-[22px] font-semibold">
          <GlitchText
            key={`profile-${isLoaded ? "on" : "off"}`}
            as="span"
            text="大橋 陸　1999年生まれ、埼玉県出身"
            delaySec={1}
            trigger="scroll"
            armed={isLoaded}
          />
        </h2>

        <p className="mt-4 text-[20px] md:text-[20px] leading-7 text-[#d6d8de]">
          高校卒業後、職人として現場で働いた経験から、丁寧さと粘り強さを大切にする姿勢を培いました。
          その後、フロントエンドエンジニアとして実務を経験し、Reactを中心にWebサイトの開発を担当。
          デジリグに入校してデザインを体系的に学び、現在は<strong>「デザイン × 実装」</strong>
          両面から提案することが可能です。ユーザーにとって直感的で心地よい体験を生み出すことを目指しています。
        </p>

        <AboutDetailsAccordion title="About 詳細をひらく">
          <StrengthBlock />
        </AboutDetailsAccordion>

        <div className="mt-16">
          <SkillBarsAbout />
        </div>

        <div className="mt-8">
          <HobbySection
            items={[
              { src: "/hobby/figaro.jpg", alt: "Figaro", label: "フィガロ", description: "チワワとペキニーズのミックス犬。毎日の癒しです。" },
              { src: "/hobby/camera.jpg", alt: "Photography", label: "写真", description: "最近はデジカメにハマってます。" },
              { src: "/hobby/movie1.jpg", alt: "Cinema", label: "映画", description: "休日は映画館で映画をよく観ています。" },
              { src: "/hobby/snow.jpg", alt: "Snow Trip", label: "スノーボード", description: "唯一の体を動かす趣味です。" },
              { src: "/hobby/car.jpg", alt: "Car", label: "CIVIC", description: "" },
              { src: "/hobby/NewYork.jpg", alt: "NewYork", label: "ニューヨーク", description: "いろんな国に旅行に行くのが夢です。" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
