"use client";

import MarqueeFrame from "../MarqueeFrame";
import FadeInText from "../FedeInText";
import SkillBarsAbout from "../SkillBarsAbout"; // ← 先ほど作ったSkillBarsをインポート
import HobbySection from "../HobbySection";

export default function AboutSection() {
  return (
    <section className="w-full bg-[#121316] text-white">
      <div className="max-w-[1100px] mx-auto px-6 pt-25 pb-14">
        {/* 上段 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="leading-[1.02]">
            <FadeInText
              text="Riku"
              from="left"
              className="text-[48px] md:text-[72px] font-serif"
            />
            <br />
            <FadeInText
              text="Ohashi"
              from="left"
              baseDelay={0.3}
              className="text-[48px] md:text-[72px] font-serif"
            />
          </div>

          <div
            className="w-full aspect-[16/9] rounded-md bg-[#e9ebee]"
            style={{
              backgroundPosition: "center",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundImage: "url(/projects/about-visual.jpg)",
            }}
            aria-label="About visual"
            role="img"
          />
        </div>

        {/* 下段：プロフィール */}
        <h2 className="mt-12 text-[20px] md:text-[22px] font-semibold">
          <FadeInText
            text="大橋 陸　1999年生まれ、埼玉県出身"
            from="right"
            baseDelay={0.3}
          />
        </h2>

        <p className="mt-4 text-[14px] md:text-[15px] leading-7 text-[#d6d8de]">
          高校卒業後、職人として現場で働いた経験から、丁寧さと粘り強さを大切にする姿勢を培いました。
          その後、フロントエンドエンジニアとして実務を経験し、ReactやNext.jsを中心にWebサイトの開発を担当。
          デジリグに入校してデザインを体系的に学び、現在は<strong>「デザイン × 実装」</strong>
          両面から提案できるUI/UXデザイナーとして活動しています。
          ユーザーにとって直感的で心地よい体験を生み出すことを目指しています。
        </p>

        {/* 下段：MarqueeFrame */}
        {/* <div className="mt-10 flex justify-center">
          <div style={{ width: 300, height: 400 }}>
            <MarqueeFrame />
          </div>
        </div> */}

        <div className="mt-16">
          <SkillBarsAbout />
        </div>
        <div className="mt-8">
        <HobbySection
  items={[
    {
      src: "/hobby/figaro.jpg",
      alt: "Figaro",
      label: "My Dog Figaro",
      description: "チワワとペキニーズのミックス犬。毎日の癒しと相棒です。"
    },
    {
      src: "/hobby/camera.jpg",
      alt: "Photography",
      label: "Photography",
      description: "街のスナップや旅先の風景を撮影するのが好きです。"
    },
    {
      src: "/hobby/car.jpg",
      alt: "Car",
      label: "Car",
      description: "夜のドライブで眺める街灯りやテールランプが最高。"
    },
    { 
      src: "/hobby/snow.jpg",
      alt: "Snow Trip",
      label: "ゆき",
      description: "夜のドライブで眺める街灯りやテールランプが最高。"
    },
    {
      src: "/hobby/aquarium.jpg",
      alt: "Aquarium",
      label: "クラゲ",
      description: "夜のドライブで眺める街灯りやテールランプが最高。"
    },
    { 
      src: "/hobby/movie.jpg",
      alt: "Cinema" ,
      label: "パーマ",
      description: "夜のドライブで眺める街灯りやテールランプが最高。"
    },
  ]}
/>
      </div>
      </div>
    </section>
  );
}
