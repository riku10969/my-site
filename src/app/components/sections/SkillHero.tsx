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
import { useSkillHeroTimeline, HERO_HOLD_RATIO } from "../gsap/SkillLayerTimeline";
import {
  useSkillIntroStage,
  SKILL_INTRO_TILT_CLASS,
  SKILL_INTRO_CANVAS_CLASS,
} from "../webgl/SkillIntroStage";
import { neonStyle, type Skill } from "./SkillLayer";

export default function SkillHero({ skills }: { skills: Skill[] }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  // 円柱を奥と手前の 2 枚に分けて描く。見出しはそのあいだに挟まる
  const introBackRef = useRef<HTMLCanvasElement | null>(null);
  const introFrontRef = useRef<HTMLCanvasElement | null>(null);
  // 円柱に横切らせたい対象。文字を基準に置くことで、画面比が変わっても
  // 「文字の終わりのあたりを横切る」状態が保たれる
  const headingRef = useRef<HTMLSpanElement | null>(null);

  useSkillHeroTimeline({ sectionRef, stageRef });
  useSkillIntroStage(introBackRef, introFrontRef, headingRef);

  return (
    <StackSection
      id="skill"
      underNext
      // 1 枚目が乗り上げ始める前に、見出しを見せる時間を少しだけ取る。
      // 幅で分けない（timeline 側の coverAt が同じ値で区切りを計算する）
      hold={{ sm: HERO_HOLD_RATIO, md: HERO_HOLD_RATIO }}
      sectionRef={sectionRef}
      stageRef={stageRef}
      stageClassName="relative flex items-center overflow-hidden bg-[#0b0b0c] px-5 py-8 sm:px-8 md:px-10 lg:px-14"
    >
      {/* 斜めの面（WebGL）の**奥側**。円柱の奥に回った写真がここに描かれる。
          登場アニメーションは持たない（開いた最初の描画から所定の位置にあること）。
          data-inner より前に置くことで文字の後ろに描かれる（どちらも z-index は
          auto なので描画順は DOM 順で決まる） */}
      <div className={SKILL_INTRO_TILT_CLASS}>
        <canvas ref={introBackRef} className={SKILL_INTRO_CANVAS_CLASS} aria-hidden />
      </div>

      {/* 文字側を沈めるスクリム。面の上・文字の下に敷く。
          写真は右へ抜けていくので、左を濃くして見出しのコントラストを確保する */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(11,11,12,.92) 0%, rgba(11,11,12,.7) 18%, rgba(11,11,12,.3) 36%, rgba(11,11,12,.06) 58%, transparent 74%)",
        }}
      />

      {/* 淡い発光 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 left-1/2 h-[90svh] w-[90svh] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, #2ccdb9 0%, transparent 70%)", opacity: 0.09 }}
      />

      {/* max-w を持たせない。見出しをステージのパディング幅いっぱいまで使わせるため。
          説明文と目次は自分側で上限を持つ */}
      <div data-inner className="relative w-full">

        {/* 横幅いっぱいまで大きくする。手前に来た写真が文字の上を通るので、
            文字の隙間が大きいほど「縫う」動きが見える。
            折り返しても崩れないよう leading を詰めている */}
        <h1 className="font-serif text-[clamp(2.75rem,10.5vw,9rem)] leading-[0.95] font-semibold tracking-tight">
          <span
            ref={headingRef}
            className="text-white [text-shadow:_0_0_24px_rgba(44,205,185,.28),_0_0_60px_rgba(0,0,0,.9)]"
          >
            Skill Detail
          </span>
        </h1>

        <p className="mt-6 max-w-[48ch] font-serif text-sm leading-relaxed text-white/70 md:text-base md:leading-8">
          ブランディングからデザイン、フロントエンド・バックエンドの実装、GSAP と
          Three.js の演出まで。ひとつずつ、どこまでできるかを並べています。
        </p>

        {/* 目次。スクロールでこの順に出てくる */}
        <ul className="mt-8 grid max-w-6xl gap-px overflow-hidden rounded-2xl ring-1 ring-white/10 sm:grid-cols-2 md:mt-12 lg:grid-cols-3">
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

      {/* 斜めの面（WebGL）の**手前側**。円柱の手前に来た写真がここに描かれ、
          見出しの文字より前を通る。奥側とまったく同じ箱でなければ前後の絵が
          繋がらないので、class は定数で共有している。
          pointer-events-none は SKILL_INTRO_TILT_CLASS に入っている（目次を
          押せなくしないため） */}
      <div className={SKILL_INTRO_TILT_CLASS}>
        <canvas ref={introFrontRef} className={SKILL_INTRO_CANVAS_CLASS} aria-hidden />
      </div>
    </StackSection>
  );
}
