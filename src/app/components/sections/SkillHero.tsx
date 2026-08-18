/**
 * SkillHero
 *
 * /skills の先頭、見出しのレイヤー。これも `ui/StackSection` の重ね積みに参加する
 * ので、1 枚目のスキルが乗り上げてくる間に引いていく。退場は
 * `gsap/SkillLayerTimeline` の `useSkillHeroTimeline` が持つ。
 *
 * 中身（目次・説明文）は仮置き。何を出すかは後で詰める。
 */
"use client";

import React, { useRef } from "react";
import StackSection from "../ui/StackSection";
import { useSkillHeroTimeline } from "../gsap/SkillLayerTimeline";
import { neonStyle, type Skill } from "./SkillLayer";

export default function SkillHero({ skills }: { skills: Skill[] }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useSkillHeroTimeline({ sectionRef, stageRef });

  return (
    <StackSection
      id="skill"
      underNext
      sectionRef={sectionRef}
      stageRef={stageRef}
      stageClassName="relative flex items-center overflow-hidden bg-[#0b0b0c] px-5 py-8 sm:px-8 md:px-10 lg:px-14"
    >
      {/* 淡い発光 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 left-1/2 h-[90svh] w-[90svh] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, #2ccdb9 0%, transparent 70%)", opacity: 0.09 }}
      />

      <div data-inner className="relative mx-auto w-full max-w-6xl">
        <p className="mb-3 text-xs font-medium tracking-[0.3em] text-white/45 uppercase">
          Skill Detail
        </p>

        <h1 className="font-serif text-5xl font-semibold tracking-wide md:text-6xl lg:text-7xl">
          <span className="text-white [text-shadow:_0_0_24px_rgba(44,205,185,.2)]">Skill</span>
        </h1>

        <p className="mt-6 max-w-[48ch] font-serif text-sm leading-relaxed text-white/70 md:text-base md:leading-8">
          ブランディングからデザイン、フロントエンド・バックエンドの実装、GSAP と
          Three.js の演出まで。ひとつずつ、どこまでできるかを並べています。
        </p>

        {/* 目次。スクロールでこの順に出てくる */}
        <ul className="mt-8 grid gap-px overflow-hidden rounded-2xl ring-1 ring-white/10 sm:grid-cols-2 md:mt-12 lg:grid-cols-3">
          {skills.map((s) => (
            <li key={s.id} className="bg-white/[0.03] px-4 py-3.5">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-[100] tracking-widest" style={neonStyle(s.accent)}>
                  {s.num}
                </span>
                <span className="font-serif text-[15px] tracking-wide text-white/90">{s.title}</span>
              </div>
              <p className="mt-1 text-[11px] tracking-wider text-white/45">{s.tagJa}</p>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-[10px] tracking-[0.35em] text-white/35 uppercase md:mt-12">
          Scroll
        </p>
      </div>
    </StackSection>
  );
}
