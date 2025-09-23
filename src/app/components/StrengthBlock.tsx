"use client";

import GlitchText from "./GlitchText";

export default function StrengthBlock() {
  const strengths = [
    {
      num: "01",
      title: "適応力",
      text: "これまでさまざまな言語やさまざまなプロジェクトに参加してきましたが、短期間で新しい環境に適応し、習熟してきました。状況を素早く理解し、必要なスキルを吸収して成果につなげる柔軟さを持っています。",
    },
    {
      num: "02",
      title: "メンタル",
      text: "職人として現場仕事をしていた経験から、厳しい環境でも冷静に物事を進める忍耐力と、突発的なトラブルにも柔軟に対応できる強いメンタルを培いました。困難な状況でも前向きに取り組み、最後までやり遂げる姿勢を持っています。",
    },
    {
      num: "03",
      title: "技術力",
      text: "デザインとフロントエンドの二面性を活かし、Figmaを用いたビジュアル設計からReact/Next.js・TypeScriptによる実装まで一貫して対応できます。UI/UXを意識した演出やアニメーション、パフォーマンス最適化までトータルに提供し、デザインと実装の両側からブランド体験を高めることが可能です。",
    },
  ];

  return (
    <section aria-labelledby="strength-title" className="text-[#d6d8de]">
      <div className="grid md:grid-cols-12 gap-6 md:gap-8">
        {/* 左見出し */}
        <header className="md:col-span-3 pt-2 pb-2 md:pt-4 md:pb-2">
          {/* ★ Strength に GlitchText + サイズ小さめ */}
          <GlitchText
            key="strength-heading"
            as="h3"
            text="Strength"
            delaySec={0.2}
            trigger="scroll"
            armed={true}
            variant="mono"
            className="!text-[#FFFFFF] text-[36px] md:text-[54px] font-semibold leading-tight md:leading-[1.1]"
          />
          <p className="mt-1 text-sm tracking-wide text-white/60">私の強み</p>
        </header>

        {/* 右：各項目 */}
        <div className="md:col-span-9 space-y-12">
          {strengths.map(({ num, title, text }) => (
            <article key={num} className="flex items-start gap-6">
              {/* ミント固定の番号 */}
              <GlitchText
                key={`num-${num}`}
                as="span"
                variant="mono"
                text={num}
                delaySec={0.2}
                trigger="scroll"
                armed={true}
                className="!text-[#2CCDB9] text-3xl md:text-5xl font-bold leading-none select-none"
              />

              <div className="space-y-2">
                {/* 紫固定の見出し */}
                <GlitchText
                  key={`strength-${title}`}
                  as="h4"
                  text={title}
                  variant="mono"
                  delaySec={0.3}
                  trigger="scroll"
                  armed={true}
                  className="!text-[#6D32C2] text-lg md:text-xl font-semibold"
                />
                <p className="leading-7">{text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
