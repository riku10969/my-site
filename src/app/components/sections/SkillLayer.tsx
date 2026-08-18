/**
 * SkillLayer
 *
 * /skills の重ね積みレイヤー 1 枚。器は `ui/StackSection`、動きは
 * `gsap/SkillLayerTimeline` に委譲していて、ここが持つのはマークアップだけ。
 *
 * レイヤーは**全画面**。張り付く層（StackSection の stage）そのものを不透明な面に
 * して画面いっぱいに敷き、乗り上げたときに前のレイヤーを完全に隠す。上端の
 * ヘアラインだけがアクセント色になっていて、そこが「前縁」として見える。
 *
 * 面は transform しない。全画面なので縮めると端に隙間が空いて下のレイヤーが
 * 覗いてしまう。GSAP が動かすのは中身（`[data-inner]`）だけ。
 *
 * スキルごとに写真の見せ方を変えている（`variant`）。どれも 1 本の timeline に
 * 載るので、どの要素の transform を誰が持つかが 1 レイヤー内で一意に決まる。
 *
 *   flip  … 写真を重ねてカードのように順にめくる（backface を隠して下を出す）
 *   loop  … 写真を横一列に並べ、スクロール量で横へ流す
 *   depth … 写真を段違いに置き、奥のものほど大きく動かして奥行きを出す
 *   split … 写真を順に立ち上げ、見出しは 1 文字ずつ（`gsap/CharReveal`）
 *
 * 隠しておく初期状態は inline style で書いている。`gsap.set` に任せると、
 * それが走るまでの 1 フレームだけ素の状態（= 見えている）で描かれてしまう。
 */
"use client";

import Image from "next/image";
import React, { useRef } from "react";
import StackSection from "../ui/StackSection";
import CharReveal from "../gsap/CharReveal";
import { useSkillLayerTimeline, HOLD_RATIO, type SkillVariant } from "../gsap/SkillLayerTimeline";

export type Skill = {
  id: string;
  num: string;
  title: string;
  tagJa: string;
  body: string;
  imgs: string[];
  variant: SkillVariant;
  /**
   * アクセント色。番号のネオン・ヘアライン・淡い発光・背景の巨大な数字に使う。
   * `neonStyle()` が末尾にアルファを足すので **6 桁の hex** で書くこと。
   */
  accent: string;
  /** できることの箇条書き。中身は後で詰める前提の仮置き */
  points: string[];
  /** 使う道具。同じく仮置き */
  tools: string[];
};

/** 隠しておく初期状態。GSAP の fromTo が即座に上書きする */
const HIDDEN: React.CSSProperties = {
  opacity: 0,
  visibility: "hidden",
  transform: "translateY(28px)",
};

const IMG_SIZES = "(min-width:1024px) 45vw, (min-width:768px) 50vw, 90vw";

/**
 * 番号のネオン。globals.css の `.neon-*` と同じ重ね方を、セクションごとの
 * アクセント色から組む。
 *
 * セクションが 6 つあるので `.neon-*` を 6 色ぶん足すこともできたが、そうすると
 * 「番号の色」と「ヘアライン・発光・背景の数字の色」を別々に持つことになり、
 * 片方だけ変えると食い違う。色の持ち主は `Skill.accent` の 1 か所にしている。
 */
export function neonStyle(accent: string): React.CSSProperties {
  return {
    color: accent,
    textShadow: `0 0 6px ${accent}, 0 0 14px ${accent}, 0 0 28px ${accent}cc, 0 0 56px ${accent}99`,
  };
}

/* ----------------------------------------------------------------------------
   写真の見せ方（variant ごと）
---------------------------------------------------------------------------- */

const MEDIA_BOX = "h-[190px] sm:h-[230px] md:h-[280px] lg:h-[340px]";

function FlipDeck({ imgs, title }: { imgs: string[]; title: string }) {
  return (
    <div
      data-reveal
      className={`relative ${MEDIA_BOX}`}
      // perspective は transform とは別プロパティなので、GSAP が y を書いても残る
      style={{ ...HIDDEN, perspective: "1200px" }}
    >
      {imgs.map((src, i) => (
        <div
          key={src}
          data-flip-card
          className="absolute inset-0 overflow-hidden rounded-2xl ring-1 ring-white/15 shadow-2xl"
          // 手前から順に重ねる。90 度を越えると backface が隠れて下の写真が出る
          style={{ zIndex: imgs.length - i, backfaceVisibility: "hidden" }}
        >
          <Image src={src} alt={title} fill sizes={IMG_SIZES} className="object-cover object-center" />
        </div>
      ))}
    </div>
  );
}

function ImageLoop({ imgs, title }: { imgs: string[]; title: string }) {
  // 1 周ぶんを 2 回並べる。xPercent -50 でちょうど 1 周ぶん進む
  const track = [...imgs, ...imgs];
  return (
    <div
      data-reveal
      className="relative overflow-hidden rounded-2xl ring-1 ring-white/15 shadow-2xl"
      style={HIDDEN}
    >
      <div data-loop-track className="flex gap-4" style={{ width: "max-content" }}>
        {track.map((src, i) => (
          <div key={`${src}-${i}`} className={`relative w-[66vw] shrink-0 md:w-[30vw] ${MEDIA_BOX}`}>
            <Image src={src} alt={title} fill sizes={IMG_SIZES} className="object-cover object-center" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 段違いのずらし幅（枠に対する %）。
 *
 * **ずらし幅を固定して、タイルの大きさを枚数から決める。** 逆（大きさを固定して
 * ずらし幅を枚数で割る）にすると、枚数が増えたときにずらし幅が足りず、手前の 1 枚が
 * 奥を覆い隠してしまう。
 */
const DEPTH_STEP_X = 18;
const DEPTH_STEP_Y = 20;

function DepthStack({ imgs, title }: { imgs: string[]; title: string }) {
  const gaps = imgs.length - 1;
  const w = 100 - gaps * DEPTH_STEP_X;
  const h = 100 - gaps * DEPTH_STEP_Y;

  return (
    <div data-reveal className={`relative ${MEDIA_BOX}`} style={HIDDEN}>
      {imgs.map((src, i) => (
        <div
          key={src}
          data-depth
          className="absolute overflow-hidden rounded-2xl ring-1 ring-white/15 shadow-2xl"
          // 静的なずらしは top / left で書く。transform は GSAP が専有する
          style={{
            top: `${i * DEPTH_STEP_Y}%`,
            left: `${i * DEPTH_STEP_X}%`,
            width: `${w}%`,
            height: `${h}%`,
            zIndex: i + 1,
          }}
        >
          <Image src={src} alt={title} fill sizes={IMG_SIZES} className="object-cover object-center" />
        </div>
      ))}
    </div>
  );
}

function SplitReveal({ imgs, title }: { imgs: string[]; title: string }) {
  return (
    <div data-reveal className={`grid grid-cols-2 gap-3 ${MEDIA_BOX}`} style={HIDDEN}>
      {imgs.map((src) => (
        <div
          key={src}
          data-split
          className="relative h-full overflow-hidden rounded-2xl ring-1 ring-white/15 shadow-2xl"
          style={{ opacity: 0, visibility: "hidden" }}
        >
          <Image src={src} alt={title} fill sizes={IMG_SIZES} className="object-cover object-center" />
        </div>
      ))}
    </div>
  );
}

function Media({ skill }: { skill: Skill }) {
  const { variant, imgs, title } = skill;
  if (variant === "flip") return <FlipDeck imgs={imgs} title={title} />;
  if (variant === "loop") return <ImageLoop imgs={imgs} title={title} />;
  if (variant === "depth") return <DepthStack imgs={imgs} title={title} />;
  return <SplitReveal imgs={imgs} title={title} />;
}

/* ----------------------------------------------------------------------------
   レイヤー本体
---------------------------------------------------------------------------- */

export default function SkillLayer({
  skill,
  index,
  total,
  isLast,
}: {
  skill: Skill;
  index: number;
  total: number;
  /** 最後のレイヤーは次に覆われない。区間の取り方が変わる */
  isLast: boolean;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useSkillLayerTimeline({ sectionRef, stageRef, variant: skill.variant, isLast });

  // 偶数番は写真を右に置いて左右交互にする
  const flipped = index % 2 === 1;

  return (
    <StackSection
      id={skill.id}
      underNext={!isLast}
      // 覆われずに読ませる区間。timeline 側が同じ値で区切りを計算する
      hold={HOLD_RATIO}
      sectionRef={sectionRef}
      stageRef={stageRef}
      // 面はここ。全画面・不透明。overflow-hidden は sticky 自身に付ける分には害がない
      stageClassName="relative flex items-center overflow-hidden bg-[#0d0e11] px-5 py-8 sm:px-8 md:px-10 lg:px-14"
    >
      {/* 乗り上げてくる前縁。これがあるので重なりの境目が見える */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${skill.accent}, transparent)`, opacity: 0.7 }}
      />

      {/* 淡い発光。面が真っ平らにならないように置いている */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/4 left-1/2 h-[70svh] w-[70svh] -translate-x-1/2 rounded-full"
        style={{ background: `radial-gradient(circle, ${skill.accent} 0%, transparent 70%)`, opacity: 0.07 }}
      />

      {/* 背景の巨大な数字 */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-2vw] bottom-[-6vh] font-display leading-none select-none text-[38vw] md:text-[24vw]"
        style={{ color: skill.accent, opacity: 0.05 }}
      >
        {skill.num}
      </div>

      <div data-inner className="relative mx-auto w-full max-w-6xl">
        {/* 通し番号。今どこを見ているかの目印 */}
        <div
          data-reveal
          className="mb-6 flex items-center gap-3 md:mb-10"
          style={HIDDEN}
        >
          <span className="text-[10px] font-medium tracking-[0.3em] text-white/40 uppercase">
            Skill
          </span>
          <span aria-hidden className="h-px w-8" style={{ background: skill.accent, opacity: 0.5 }} />
          <span className="text-[10px] tracking-[0.2em] text-white/40 tabular-nums">
            {skill.num} / {String(total).padStart(2, "0")}
          </span>
        </div>

        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
          <div className={flipped ? "md:order-2" : ""}>
            <Media skill={skill} />
          </div>

          <div className={flipped ? "md:order-1" : ""}>
            {/* split だけ見出しを CharReveal に持たせるので data-reveal を付けない
                （同じ要素の autoAlpha を 2 か所から触らないため） */}
            {skill.variant === "split" ? (
              <>
                <div data-reveal className="mb-1" style={HIDDEN}>
                  <span
                    className="font-[100] text-4xl tracking-widest md:text-5xl"
                    style={neonStyle(skill.accent)}
                  >
                    {skill.num}
                  </span>
                </div>
                <CharReveal
                  as="h2"
                  text={skill.title}
                  className="mb-4 block font-serif text-3xl font-semibold tracking-wide md:text-4xl lg:text-5xl"
                />
              </>
            ) : (
              <div data-reveal className="mb-4 flex items-baseline gap-4" style={HIDDEN}>
                <span
                  className="font-[100] text-4xl tracking-widest md:text-5xl"
                  style={neonStyle(skill.accent)}
                >
                  {skill.num}
                </span>
                <h2 className="font-serif text-3xl font-semibold tracking-wide md:text-4xl lg:text-5xl">
                  {skill.title}
                </h2>
              </div>
            )}

            <p
              data-reveal
              className="mb-4 text-sm font-medium tracking-wider text-[#A855F7]/90 md:text-base"
              style={HIDDEN}
            >
              {skill.tagJa}
            </p>

            <p
              data-reveal
              className="mb-6 max-w-[58ch] font-serif text-sm leading-relaxed text-white/85 md:text-base md:leading-8"
              style={HIDDEN}
            >
              {skill.body}
            </p>

            {/* できることの箇条書き */}
            <ul data-reveal className="mb-6 grid gap-2" style={HIDDEN}>
              {skill.points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-white/70 md:text-[15px]">
                  <span
                    aria-hidden
                    className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full"
                    style={{ background: skill.accent }}
                  />
                  {p}
                </li>
              ))}
            </ul>

            {/* 使う道具 */}
            <ul data-reveal className="flex flex-wrap gap-2" style={HIDDEN}>
              {skill.tools.map((t) => (
                <li
                  key={t}
                  className="rounded-full px-3 py-1 text-[11px] tracking-wider text-white/60 ring-1 ring-white/15"
                >
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </StackSection>
  );
}
