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
 */
"use client";

import React from "react";
import styles from "../../styles/SkillStack.module.css";

type Props = {
  children: React.ReactNode;
  /** 次のセクションが 1 画面ぶん乗り上げてくる。最後のセクションだけ false */
  underNext?: boolean;
  /** 覆われずに張り付いて待つ区間の長さ（可視高の倍数）。読ませる時間になる */
  hold?: number;
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
  hold = 0,
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
      // --s-visible は .section 自身が定義しているので、同じ要素の inline style から参照できる
      style={{ "--s-hold": `calc(var(--s-visible) * ${hold})` } as React.CSSProperties}
    >
      <div ref={stageRef} className={`${styles.stage} ${stageClassName}`}>
        {children}
      </div>
    </section>
  );
}
