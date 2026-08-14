/**
 * カーテン（ページを覆う遷移演出）の見せ方を差し替えるための型。
 *
 * 骨組み（オーバーレイ・格子・色・LOADING・遷移を始めるタイミング）は
 * `gsap/TileTransition.tsx` が持ち、ここには「分割数」と「どう動くか」だけを書く。
 * 同じ格子 DOM を使い回すので、見せ方を増やしても DOM は増えない。
 */
import type gsap from "gsap";

export type CurtainLayout = {
  /** 横の分割数 */
  cols: number;
  /** 縦の分割数 */
  rows: number;
};

export type Curtain = {
  layout: CurtainLayout;
  /**
   * タイルに毎回追加で当てるスタイル。色収差など、見せ方に固有の見た目をここに置く。
   * 指定しなかったプロパティは骨組み側が既定値に戻す。
   */
  tileVars?: gsap.TweenVars;
  /** 覆う動きを timeline に積む。開始状態の gsap.set もここで行う */
  cover(tl: gsap.core.Timeline, tiles: HTMLElement[], layout: CurtainLayout): void;
  /** 剥がれる動きを timeline に積む */
  uncover(tl: gsap.core.Timeline, tiles: HTMLElement[], layout: CurtainLayout): void;
};
