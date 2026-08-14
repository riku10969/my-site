/**
 * grid — 採用中の見せ方
 *
 * 正方形タイルが右上から左下へ不規則に出現して覆う。
 * 剥がれるときは逆に左下から波が始まり、そのまま左下へ流れ抜ける。
 */
import gsap from "gsap";
import type { Curtain, CurtainLayout } from "./types";

const COLS = 8;
const ROWS = 14;

const IN_DURATION = 0.5;
const OUT_DURATION = 0.42;

/** 波が隣のタイルへ進むのにかける秒数 */
const WAVE_STEP = 0.02;
/** 各タイルに足すゆらぎの最大値。これが「不規則さ」になる */
const WAVE_JITTER = 0.07;

/** タイルが入ってくる向き（右上から）。単位はタイル自身のサイズに対する % */
const ENTER_X_PERCENT = 70;
const ENTER_Y_PERCENT = -70;
/**
 * 剥がれて出ていく向き（左下へ）。入ってきた向きへ戻すのではなく
 * そのまま流れ抜けるほうが動きが繋がって見える。
 * 巻き戻るように見せたい場合は ENTER_* と同じ符号にする。
 */
const EXIT_X_PERCENT = -70;
const EXIT_Y_PERCENT = 70;

/**
 * originIndex から同心円状に広がる波。距離に比例した遅延にゆらぎを足すので、
 * きれいな斜線にならず不規則に散る。
 *
 * gsap の stagger には grid オプションがあるが `[行数, 列数]` の順で
 * 取り違えやすい（実際このコードは以前 転置した値を渡していた）ので、
 * 距離は自前で出している。
 */
function waveFrom(originIndex: number, { cols }: CurtainLayout) {
  const originRow = Math.floor(originIndex / cols);
  const originCol = originIndex % cols;
  return (index: number) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const distance = Math.hypot(row - originRow, col - originCol);
    return distance * WAVE_STEP + Math.random() * WAVE_JITTER;
  };
}

export const gridCurtain: Curtain = {
  layout: { cols: COLS, rows: ROWS },

  cover(tl, tiles, layout) {
    // 右上の方向に逃がしておき、そこから定位置へ寄せる
    gsap.set(tiles, {
      xPercent: ENTER_X_PERCENT,
      yPercent: ENTER_Y_PERCENT,
      opacity: 0,
    });
    tl.to(tiles, {
      xPercent: 0,
      yPercent: 0,
      opacity: 1,
      duration: IN_DURATION,
      ease: "power2.out",
      // 右上のタイル（0 行目・最終列）から
      stagger: waveFrom(layout.cols - 1, layout),
    });
  },

  uncover(tl, tiles, layout) {
    gsap.set(tiles, { xPercent: 0, yPercent: 0, opacity: 1 });
    tl.to(tiles, {
      xPercent: EXIT_X_PERCENT,
      yPercent: EXIT_Y_PERCENT,
      opacity: 0,
      duration: OUT_DURATION,
      ease: "power2.in",
      // 覆うときと逆に、左下のタイル（最終行・0 列目）から
      stagger: waveFrom((layout.rows - 1) * layout.cols, layout),
    });
  },
};
