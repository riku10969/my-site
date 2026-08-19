/**
 * SkillLayerTimeline
 *
 * /skills の重ね積みレイヤーの動き。`sections/SkillLayer` から呼ばれる。
 *
 * 1 レイヤー = 1 timeline。共通の「立ち上がり」「後退」と、スキルごとに違う
 * 見せ方（フリップ / 横ループ / 奥行き / 順次）を **同じ timeline に載せている**。
 * README の「1 つのプロパティを複数の ScrollTrigger で触らない」を守るため、
 * レイヤー内で transform を持つ要素の持ち主を timeline 1 本に寄せてある。
 *
 * trigger は `ui/StackSection` の外枠（張り付き区間を含む背の高い箱）で、
 * 区間は start "top bottom" → end "bottom bottom"。この区間が
 *
 *   上がってくる  … 下から現れて前のレイヤーを覆っていく
 *   完全に見える  … 誰にも覆われず張り付いて待つ（`HOLD_RATIO` ぶん。読ませる区間）
 *   覆われる      … 次のレイヤーが下から上がってきて覆っていく
 *
 * の 3 つに分かれる。区切りの progress は `stopsFor()` が箱の寸法から計算する。
 * 張り付き自体は CSS の position: sticky が担当していて、ここでは pin を使わない
 * （`styles/SkillStack.module.css` に寸法と式の根拠がある）。
 *
 * **面（`[data-panel]`）は transform しない。** レイヤーは全画面なので、面を
 * 縮めると端に隙間が空いて下のレイヤーが覗いてしまう。動かすのは中身
 * （`[data-inner]`）だけで、面は不透明なまま置いておく。
 */
"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(ScrollTrigger, CustomEase);

export type SkillVariant = "flip" | "loop" | "depth" | "split";

/**
 * 覆われずに張り付いて待つ区間の長さ（可視高 H の倍数）。ここが読ませる時間。
 *
 * `ui/StackSection` の `hold` に渡して CSS の --s-hold にもなる。**この 1 か所が
 * 唯一の持ち主**で、CSS 側は値を持たない。0 にすると次のレイヤーが張り付き開始と
 * 同時に上がってくるので、そのレイヤーが完全に見えるのは一瞬だけになる
 * （follow.art 本家はこの状態。流れる演出には合うが、読ませる文章があると読めない）。
 */
export const HOLD_RATIO = 0.6;

/**
 * timeline 上の区切り。総尺は 1 に固定しているので position = progress。
 *
 * 箱は「上がってくる H」「待つ hold*H」「覆われる H」でできているので、
 * trigger 区間 (2 + hold) * H に対して
 *
 *   張り付き開始 = 1 / (2 + hold)
 *   覆われ始め   = (1 + hold) / (2 + hold)
 *
 * 最後のレイヤーは覆われるぶんが無いので区間が (1 + hold) * H になり、
 * 張り付き開始が 1 / (1 + hold)。そこから先は覆われずに終わるので後退も作らない。
 */
function stopsFor(hold: number, isLast: boolean) {
  if (isLast) {
    const pinAt = 1 / (1 + hold);
    return { enterAt: 0.02, enterSpan: pinAt - 0.06, holdAt: pinAt, holdTo: 1, departAt: null };
  }
  const pinAt = 1 / (2 + hold);
  const coverAt = (1 + hold) / (2 + hold);
  return { enterAt: 0.02, enterSpan: pinAt - 0.04, holdAt: pinAt, holdTo: coverAt, departAt: coverAt };
}

/** 立ち上がりで中身が起きてくる量 */
const INNER_FROM_SCALE = 0.94;
/** 後退（次に覆われる間）で中身が引っ込む量 */
const INNER_TO_SCALE = 0.97;
const INNER_TO_ALPHA = 0.25;
const INNER_TO_Y = "-4svh";

/** 中の要素が下から立ち上がる距離(px)と 1 要素ごとの遅れ */
const REVEAL_FROM_Y = 28;
const REVEAL_STAGGER = 0.038;

/** 奥行きパララックスで 1 枚ごとに増える移動量（svh） */
const DEPTH_STEP_SVH = 7;

/**
 * 順番に見せるもの（flip / split）が読ませる区間のうち何割で終わるか。
 * 残りは動かさずに置いて、落ち着いた状態で読ませる。
 * loop / depth は区間ではなく timeline 全体に紐づく連続したパララックスなので対象外。
 */
const VARIANT_SPAN = 0.7;

/** 見出しレイヤーが退場するときの量 */
const HERO_TO_SCALE = 0.94;
const HERO_TO_Y = "-8svh";

/**
 * 斜めの面が下から入ってくるときの尺と曲線。follow.art の実測値
 * （transition: transform 1.5s cubic-bezier(.55,0,.1,1) / transition-delay: 1s）。
 *
 * この曲線は中盤で一気に詰める非対称なもので、組み込みの power*.inOut では出ない
 * （t=0.25 で 0.136 / t=0.5 で 0.796 に対し、power3.inOut は 0.031 / 0.500）。
 * gsap 3.13 は CustomEase を同梱しているので追加インストールは要らない。
 */
const INTRO_DURATION = 1.5;
const INTRO_DELAY = 1;
const INTRO_EASE = CustomEase.create("skillIntro", "0.55, 0, 0.1, 1");

/* ----------------------------------------------------------------------------
   スキルのレイヤー
---------------------------------------------------------------------------- */

export function useSkillLayerTimeline({
  sectionRef,
  stageRef,
  variant,
  isLast = false,
}: {
  /** StackSection の外枠。trigger に使う */
  sectionRef: React.RefObject<HTMLElement | null>;
  /** 張り付く層。この中を querySelector する */
  stageRef: React.RefObject<HTMLDivElement | null>;
  variant: SkillVariant;
  /** 最後のレイヤー。張り付き区間が無いので区切りが変わる */
  isLast?: boolean;
}) {
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const q = <T extends HTMLElement>(sel: string) =>
      Array.from(stage.querySelectorAll<T>(sel));

    const inner = stage.querySelector<HTMLElement>("[data-inner]");
    const reveals = q("[data-reveal]");

    const stops = stopsFor(HOLD_RATIO, isLast);
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline();
      // 総尺を 1 に固定するための空トゥイーン。以降 position 引数 = progress
      tl.to({}, { duration: 1 }, 0);

      /* -- 共通：立ち上がり ------------------------------------------------ */
      if (inner) {
        tl.fromTo(
          inner,
          { scale: INNER_FROM_SCALE },
          { scale: 1, duration: stops.enterSpan, ease: "power2.out" },
          stops.enterAt
        );
      }

      if (reveals.length) {
        tl.fromTo(
          reveals,
          { y: REVEAL_FROM_Y, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: Math.max(0.1, stops.enterSpan - REVEAL_STAGGER * (reveals.length - 1)),
            stagger: REVEAL_STAGGER,
            ease: "power2.out",
          },
          stops.enterAt
        );
      }

      /* -- スキルごとの見せ方 ---------------------------------------------- */
      // 順番に見せるもの（flip / split）は読ませる区間の手前 VARIANT_SPAN で
      // 終わらせる。区間いっぱいまで使うと、最後の 1 枚が出た直後に次のレイヤーが
      // 覆い始めてしまい、出しただけで見えない
      const holdSpan = stops.holdTo - stops.holdAt;
      const variantSpan = holdSpan * VARIANT_SPAN;

      if (variant === "flip") {
        // カードを順に裏返す。backface を隠しているので 90 度を越えた時点で
        // 下のカードが現れる（= 1 枚めくるごとに次の写真になる）
        const cards = q("[data-flip-card]");
        // 最後の 1 枚は下に何も無いので裏返さない
        const flipping = cards.slice(0, -1);
        if (flipping.length) {
          const slice = variantSpan / flipping.length;
          flipping.forEach((card, i) => {
            tl.fromTo(
              card,
              { rotationY: 0 },
              { rotationY: -180, duration: slice, ease: "power2.inOut" },
              stops.holdAt + slice * i
            );
          });
        }
      }

      if (variant === "loop") {
        // トラックは 1 周ぶんを 2 回並べてあるので、-50% で同じ絵に戻る。
        // 自動で流さずスクロール量に紐付けているので、止めれば止まる
        const track = stage.querySelector<HTMLElement>("[data-loop-track]");
        if (track) {
          tl.fromTo(track, { xPercent: 0 }, { xPercent: -50, duration: 1, ease: "none" }, 0);
        }
      }

      if (variant === "depth") {
        // 奥の写真ほど大きく動かして、DOM だけで奥行きを出す
        q("[data-depth]").forEach((el, i) => {
          tl.fromTo(
            el,
            { y: 0 },
            { y: `-${DEPTH_STEP_SVH * (i + 1)}svh`, duration: 1, ease: "none" },
            0
          );
        });
      }

      if (variant === "split") {
        const items = q("[data-split]");
        if (items.length) {
          // 1 枚ぶんの尺は間隔の 1.6 倍にして隣と重ねる。最後の 1 枚が
          // variantSpan を超えないよう、その重なりぶんを割る数に含める
          const OVERLAP = 1.6;
          const slice = variantSpan / (items.length - 1 + OVERLAP);
          items.forEach((el, i) => {
            tl.fromTo(
              el,
              { autoAlpha: 0, scale: 1.08 },
              { autoAlpha: 1, scale: 1, duration: slice * OVERLAP, ease: "power2.out" },
              stops.holdAt + slice * i
            );
          });
        }
      }

      /* -- 共通：後退（次のレイヤーに覆われる間） -------------------------- */
      if (inner && stops.departAt !== null) {
        tl.to(
          inner,
          {
            scale: INNER_TO_SCALE,
            autoAlpha: INNER_TO_ALPHA,
            y: INNER_TO_Y,
            duration: 1 - stops.departAt,
            ease: "power1.in",
          },
          stops.departAt
        );
      }

      // vars に混ぜず後から作る（README の決まりごと）
      const st = ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: "bottom bottom",
        scrub: true,
        animation: tl,
      });

      return () => {
        st.kill();
        tl.kill();
      };
    });

    // 動きを減らす設定。素の状態は「隠れている」（初期状態を JSX の inline style で
    // 書いているため）なので、ここで見えるところまで進めてやる必要がある
    mm.add("(prefers-reduced-motion: reduce)", () => {
      if (reveals.length) gsap.set(reveals, { y: 0, autoAlpha: 1 });
      const items = q("[data-split]");
      if (items.length) gsap.set(items, { autoAlpha: 1, scale: 1 });
      // フリップは畳んだまま = 1 枚目が見えている状態でよい
    });

    return () => mm.revert();
  }, [sectionRef, stageRef, variant, isLast]);
}

/* ----------------------------------------------------------------------------
   見出しのレイヤー
---------------------------------------------------------------------------- */

/**
 * 見出しレイヤーの退場だけを作る。
 *
 * 見出しはページの先頭にあって最初から見えているので立ち上がりは要らない。
 * 必要なのは「1 枚目が乗り上げてくる間に引いていく」ぶんだけで、それは
 * このレイヤーの張り付き区間 = progress 0.5 〜 1 にあたる。
 *
 * これが無いと、1 枚目のレイヤーが覆いきるまでの間ずっと見出しが residue の
 * ように残って見える。
 */
export function useSkillHeroTimeline({
  sectionRef,
  stageRef,
}: {
  sectionRef: React.RefObject<HTMLElement | null>;
  stageRef: React.RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const inner = stage.querySelector<HTMLElement>("[data-inner]");
    if (!inner) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // 見出しは hold を持たない（ページ先頭なので最初から読める）。
      // 箱は「H + 覆われる H」なので、覆われ始めるのはちょうど中央
      const coverAt = 0.5;

      const tl = gsap.timeline();
      tl.to({}, { duration: 1 }, 0);
      tl.to(
        inner,
        {
          autoAlpha: 0,
          scale: HERO_TO_SCALE,
          y: HERO_TO_Y,
          duration: 1 - coverAt,
          ease: "power1.in",
        },
        coverAt
      );

      const st = ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: "bottom bottom",
        scrub: true,
        animation: tl,
      });

      return () => {
        st.kill();
        tl.kill();
      };
    });

    return () => mm.revert();
  }, [sectionRef, stageRef]);
}

/**
 * 見出しの斜めの面（`webgl/SkillIntroStage`）を下から入れる。
 *
 * 動かすのは**このラッパーだけ**。canvas 自身は静的な rotate(35deg) を持っていて、
 * そこに GSAP が transform を書くと打ち消し合う（README の「静的なずらしと GSAP の
 * アニメーションを両方 transform で書かない」）。だから 2 要素に分けている。
 *
 * 退場のフェードは持たせていない。次のレイヤーが不透明な全画面で下から覆うので、
 * 面は「隠れる」だけでよく、本家もフェードさせていない。
 */
export function useSkillIntroEntrance(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tween = gsap.fromTo(
        el,
        { yPercent: 100 },
        {
          yPercent: 0,
          duration: INTRO_DURATION,
          delay: INTRO_DELAY,
          ease: INTRO_EASE,
        }
      );
      return () => tween.kill();
    });

    // 動きを減らす設定では最初から所定の位置に置く
    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(el, { yPercent: 0 });
    });

    return () => mm.revert();
  }, [ref]);
}
