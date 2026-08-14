/**
 * カーテン（ページを覆う遷移演出）の見せ方の一覧。
 *
 * 実際に使うのは DEFAULT_CURTAIN（grid）。louver / glitch は採用しなかった案を
 * 動く状態で残してあるもので、URL に ?pt=louver / ?pt=glitch を付けて開くと
 * 切り替わる（?pt=off で解除）。指定は localStorage に残る。
 *
 * 3 つとも同じ格子 DOM を使うので、増やしても DOM は増えない。ただし
 * ここから全部 import しているため、未使用のものもバンドルには乗る
 * （中身はトゥイーンの定義だけなので数百バイト程度）。
 */
import { gridCurtain } from "./grid";
import { louverCurtain } from "./louver";
import { glitchCurtain } from "./glitch";

export type { Curtain, CurtainLayout } from "./types";

export const CURTAINS = {
  grid: gridCurtain,
  louver: louverCurtain,
  glitch: glitchCurtain,
} as const;

export type CurtainName = keyof typeof CURTAINS;

export const CURTAIN_NAMES = Object.keys(CURTAINS) as CurtainName[];

/** 採用している見せ方 */
export const DEFAULT_CURTAIN: CurtainName = "grid";

export const isCurtainName = (v: string | null | undefined): v is CurtainName =>
  !!v && (CURTAIN_NAMES as string[]).includes(v);
