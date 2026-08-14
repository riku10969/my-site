/**
 * glitch — 未採用（案C）。試したいときは URL に ?pt=glitch を付けて開く
 *
 * 横帯が左右にばらけた状態から steps() でカクッとスナップして揃う。
 * 並ぶ順番もランダムなので、走査線が乱れるような見え方になる。
 * サイトの GlitchText と同じ語彙（RGB ずれ）を box-shadow で足している。
 */
import gsap from "gsap";
import type { Curtain } from "./types";

/** 帯の本数。増やすほど細かく乱れる */
const ROWS = 18;

const IN_DURATION = 0.32;
const OUT_DURATION = 0.28;
const STEP_IN = 0.022;
const STEP_OUT = 0.018;

/** 帯が飛んでくる横方向の振れ幅（帯の幅に対する %） */
const SLIDE = 110;
/** 何段でスナップさせるか。数が少ないほどカクつきが強い */
const STEPS_IN = 5;
const STEPS_OUT = 4;

/** 色収差。マゼンタとシアンを左右にずらして重ねる */
const FRINGE = "3px 0 0 rgba(255,60,120,.45), -3px 0 0 rgba(60,230,255,.45)";

const scatter = () => gsap.utils.random(-SLIDE, SLIDE);

export const glitchCurtain: Curtain = {
  layout: { cols: 1, rows: ROWS },
  tileVars: { boxShadow: FRINGE },

  cover(tl, tiles) {
    gsap.set(tiles, { xPercent: scatter, opacity: 0 });
    tl.to(tiles, {
      xPercent: 0,
      opacity: 1,
      duration: IN_DURATION,
      ease: `steps(${STEPS_IN})`,
      stagger: { each: STEP_IN, from: "random" },
    });
  },

  uncover(tl, tiles) {
    gsap.set(tiles, { xPercent: 0, opacity: 1 });
    tl.to(tiles, {
      xPercent: scatter,
      opacity: 0,
      duration: OUT_DURATION,
      ease: `steps(${STEPS_OUT})`,
      stagger: { each: STEP_OUT, from: "random" },
    });
  },
};
