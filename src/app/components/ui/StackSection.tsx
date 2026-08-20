/**
 * StackSection
 *
 * 「張り付いたまま、次が乗り上げてくる」重ね積みセクションの器。
 * 見た目・仕組みは `styles/SkillStack.module.css` 側が持っている（そちらの
 * コメントに計算の根拠がある）。ここは class の付け外しだけを担当する。
 *
 * 使い方
 *
 *   {items.map((item, i) => (
 *     <StackSection key={item.id} underNext={i < items.length - 1}>
 *       ...
 *     </StackSection>
 *   ))}
 *
 * 最後のセクションだけ `underNext` を外す。付けたままにすると、後続（Footer）が
 * 1 画面ぶん乗り上げてきて重なる。
 *
 * `hold` は「誰にも覆われず、ただ張り付いて待つ」区間の長さ（可視高の倍数）。
 * ここが読ませる時間になる。0 だと次のセクションが張り付き開始と同時に上がって
 * くるので、そのセクションが完全に見えるのは一瞬だけになる。値は
 * `gsap/SkillLayerTimeline` の `HOLD_RATIO` を渡すこと（CSS と JS で二重に
 * 持たないため）。
 *
 * `hold` は `{ sm, md }` の 2 つを渡す。モバイルは指の一振りで大きく動くので、
 * 同じ倍率だと切り替えが速すぎるため幅で変えている。inline style の中では
 * メディアクエリが書けないので、**ここは 2 つとも流し込むだけ**で、どちらを使うかは
 * CSS 側（`--s-hold-ratio`）のメディアクエリが選ぶ。境界は
 * `SkillLayerTimeline` の `HOLD_BREAKPOINT`。
 */
"use client";

import React from "react";
import styles from "../../styles/SkillStack.module.css";

type Props = {
  children: React.ReactNode;
  /** 次のセクションが 1 画面ぶん乗り上げてくる。最後のセクションだけ false */
  underNext?: boolean;
  /** 覆われずに張り付いて待つ区間の長さ（可視高の倍数）。読ませる時間になる。
      幅ごとに 2 つ渡す（どちらを使うかは CSS のメディアクエリが選ぶ） */
  hold?: { sm: number; md: number };
  id?: string;
  /** 外枠（張り付き区間を含む背の高い箱）に足す class */
  className?: string;
  /** 中の張り付く層に足す class。背景や余白はこちらに書く */
  stageClassName?: string;
  /** ScrollTrigger の trigger に使う。外枠 = 張り付き区間そのものなので通常はこちら */
  sectionRef?: React.Ref<HTMLElement>;
  stageRef?: React.Ref<HTMLDivElement>;
};

export default function StackSection({
  children,
  underNext = false,
  hold = { sm: 0, md: 0 },
  id,
  className = "",
  stageClassName = "",
  sectionRef,
  stageRef,
}: Props) {
  return (
    <section
      ref={sectionRef}
      id={id}
      className={`${styles.section} ${underNext ? styles.underNext : ""} ${className}`}
      // 単位なしの倍率だけを渡す。可視高を掛けるのは CSS 側（--s-hold）
      style={
        {
          "--s-hold-sm": `${hold.sm}`,
          "--s-hold-md": `${hold.md}`,
        } as React.CSSProperties
      }
    >
      <div ref={stageRef} className={`${styles.stage} ${stageClassName}`}>
        {children}
      </div>
    </section>
  );
}
