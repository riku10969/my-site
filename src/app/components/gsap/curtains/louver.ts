/**
 * louver — 未採用（案B）。試したいときは URL に ?pt=louver を付けて開く
 *
 * 縦のルーバー（ブラインド）が右端から順に閉じ、開くときは左端から。
 * 要素が 9 枚しかないので grid（112 枚）より軽い。
 *
 * 奥行きは `TileTransition` 側で格子コンテナに perspective を当てて出している。
 */
import gsap from "gsap";
import type { Curtain } from "./types";

/** 枚数。増やすほど帯が細くなる */
const COLS = 9;

const IN_DURATION = 0.55;
const OUT_DURATION = 0.45;
const STEP_IN = 0.045;
const STEP_OUT = 0.04;

/** 開ききった角度。90 ちょうどだと厚みが消えて一瞬見失うので少し倒す */
const ANGLE = 92;

export const louverCurtain: Curtain = {
  layout: { cols: COLS, rows: 1 },

  cover(tl, tiles) {
    gsap.set(tiles, {
      // 左端を蝶番にして回す
      transformOrigin: "0% 50%",
      rotationY: -ANGLE,
      opacity: 0,
    });
    tl.to(tiles, {
      rotationY: 0,
      opacity: 1,
      duration: IN_DURATION,
      ease: "power3.out",
      // 右端の帯から順に閉じる
      stagger: { each: STEP_IN, from: "end" },
    });
  },

  uncover(tl, tiles) {
    gsap.set(tiles, { transformOrigin: "0% 50%", rotationY: 0, opacity: 1 });
    tl.to(tiles, {
      rotationY: ANGLE,
      opacity: 0,
      duration: OUT_DURATION,
      ease: "power3.in",
      // 覆うときと逆に、左端から開く
      stagger: { each: STEP_OUT, from: "start" },
    });
  },
};
