"use client";

import MarqueeFrame from "../MarqueeFrame";
// import FadeInText from "../FedeInText";
import GlitchText from "../GlitchText";
import SkillBarsAbout from "../SkillBarsAbout";
import HobbySection from "../HobbySection";
import AboutDetailsAccordion from "../AboutDetailsAccordion";
import StrengthBlock from "../StrengthBlock";

export default function AboutSection({ isLoaded }: { isLoaded: boolean }) {
  return (
    <section className="w-full bg-[#121316] text-white">
      <div className="max-w-[1100px] mx-auto px-6 pt-25 pb-14">
        {/* 上段 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="leading-[1.02] space-y-1">
            <GlitchText
              key={`riku-${isLoaded ? "on" : "off"}`}
              as="div"
              text="Riku"
              delaySec={0.5}
              className="text-[48px] md:text-[72px] font-serif"
              trigger="scroll"
              armed={isLoaded}    
            />
            <br />
            <GlitchText
              key={`ohashi-${isLoaded ? "on" : "off"}`}
              as="div"
              text="Ohashi"
              delaySec={0.5}
              className="text-[48px] md:text-[72px] font-serif"
              trigger="scroll"
              armed={isLoaded}    
            />
          </div>

          <div
            className="w-full aspect-[16/9] rounded-md bg-[#e9ebee]"
            style={{
              backgroundPosition: "center",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundImage: "url(/projects/project1.jpg)",
            }}
            aria-label="About visual"
            role="img"
          />
        </div>

        {/* 下段：プロフィール */}
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

        <p className="mt-4 text-[14px] md:text-[15px] leading-7 text-[#d6d8de]">
          高校卒業後、職人として現場で働いた経験から、丁寧さと粘り強さを大切にする姿勢を培いました。
          その後、フロントエンドエンジニアとして実務を経験し、Reactを中心にWebサイトの開発を担当。
          デジリグに入校してデザインを体系的に学び、現在は<strong>「デザイン × 実装」</strong>
          両面から提案することが可能です。
          ユーザーにとって直感的で心地よい体験を生み出すことを目指しています。
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
