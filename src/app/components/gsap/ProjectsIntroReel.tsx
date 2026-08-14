/**
 * ProjectsIntroReel
 *
 * トップページ Projects のイントロ演出。
 * カードが右から左へ流れ、3フェーズで徐々に減速して最後の1枚が中央で止まる。
 * 止まったらプレースホルダ → Swiper へクロスフェードする。
 *
 * `sections/ProjectsIntoro.tsx` から呼ばれる。マークアップ（カード / Swiper）は
 * セクション側にあるので、TileTransition / NeonPanelTransition と同じく
 * ref を返すフックとして実装している。
 *
 * リールのタイムラインは cards[0..2] を直接指すので 3 枚前提。
 */
"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";

export function useProjectsIntroReel({
  cardCount,
  ready,
  showSwiper,
  onReelComplete,
  onPlaceholderHidden,
}: {
  /** カード枚数 */
  cardCount: number;
  /** ローダー完了 + ハート完了 + 画像デコード完了。すべて揃ってから走らせる */
  ready: boolean;
  /** リール完了後に true になる（クロスフェード開始の合図） */
  showSwiper: boolean;
  /** リールが中央で止まったら呼ばれる（= setShowSwiper(true)） */
  onReelComplete: () => void;
  /** プレースホルダを DOM から外すタイミングで呼ばれる（= setHidePlaceholder(true)） */
  onPlaceholderHidden: () => void;
}) {
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const swiperWrapperRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<HTMLDivElement[]>([]);

  // コールバックは毎レンダーで作り直されるので、依存配列に入れずに ref 経由で読む
  // （入れるとリールが組み直されてしまう）
  const cb = useRef({ onReelComplete, onPlaceholderHidden });
  useEffect(() => {
    cb.current = { onReelComplete, onPlaceholderHidden };
  });

  // --- 初回アニメ: 高速ループ → 徐々に遅く → Contact→Works→About で About が中央で止まる ---
  useLayoutEffect(() => {
    if (!ready || !placeholderRef.current) return;

    cardRefs.current = cardRefs.current.slice(0, cardCount);

    const ctx = gsap.context(() => {
      const cards = cardRefs.current.filter(Boolean);
      if (cards.length < 3) return;

      const W = window.innerWidth || 1;

      gsap.set(cards, {
        transformOrigin: "50% 50%",
        xPercent: -50,
        yPercent: -50,
        x: W,
        y: 0,
        opacity: 0,
        willChange: "transform,opacity",
      });

      // 全カード共通: 必ず右から入って左へ出る（毎回右にリセットしてから動かす）
      const runCard = (index: number, duration: number, timeline: gsap.core.Timeline) => {
        timeline
          .set(cards[index], { x: W, y: 0, opacity: 0 })
          .to(cards[index], { x: 0, y: 0, opacity: 1, duration })
          .to(cards[index], { x: -W, y: 0, opacity: 0, duration });
      };

      const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });

      // Phase 1: 見えないくらい速いループ 2周（ほんの少し遅くして流れを感じやすく）
      const blur = 0.072;
      for (let cycle = 0; cycle < 2; cycle++) {
        runCard(0, blur, tl);
        runCard(1, blur, tl);
        runCard(2, blur, tl);
      }

      // Phase 2: 1周だけ少し遅く（形が見え始める）
      const mid = 0.17;
      runCard(0, mid, tl);
      runCard(1, mid, tl);
      runCard(2, mid, tl);

      // Phase 3: 本番 — 右から左へ Contact→Works→About、About が中央に残る（最後の一周はゆっくり）
      tl.set(cards[0], { x: W, y: 0, opacity: 0 })
        .to(cards[0], { x: 0, y: 0, opacity: 1, duration: 0.34 })
        .to(cards[0], { x: -W, y: 0, opacity: 0, duration: 0.34 })
        .set(cards[1], { x: W, y: 0, opacity: 0 })
        .to(cards[1], { x: 0, y: 0, opacity: 1, duration: 0.4 })
        .to(cards[1], { x: -W, y: 0, opacity: 0, duration: 0.4 })
        .set(cards[2], { x: W, y: 0, opacity: 0 })
        .to(cards[2], {
          x: 0,
          y: 0,
          opacity: 1,
          duration: 0.48,
          ease: "power2.out",
        })
        // とどまった状態を少し保持してから Swiper 表示（変形の一瞬を防ぐ）
        .to({}, { duration: 0.22, onComplete: () => cb.current.onReelComplete() });
    }, placeholderRef);

    return () => ctx.revert();
  }, [ready, cardCount]);

  // --- プレースホルダ → Swiper の切り替え（重ねず順番に＝変形を防ぐ） ---
  const crossfadeRef = useRef<gsap.core.Timeline | null>(null);
  useLayoutEffect(() => {
    // crossfadeRef を「もう始めたか」の番兵に使う。onPlaceholderHidden で親の state が
    // 変わっても組み直さない
    if (!showSwiper || crossfadeRef.current) return;

    const placeholderEl = placeholderRef.current;
    const swiperEl = swiperWrapperRef.current;
    if (!placeholderEl || !swiperEl) return;

    gsap.set(swiperEl, { opacity: 0 });
    const tl = gsap.timeline();
    crossfadeRef.current = tl;
    // 1. アニメ用画像を先に完全にフェードアウト（スワイパー画像と重ならない）
    tl.to(placeholderEl, { opacity: 0, duration: 0.28, ease: "power2.in" });
    // 2. プレースホルダを DOM から外してからスワイパーをフェードイン
    tl.add(() => cb.current.onPlaceholderHidden());
    tl.to(swiperEl, { opacity: 1, duration: 0.28, ease: "power2.out" });
  }, [showSwiper]);

  // クロスフェードはアンマウント時だけ止める。進行中に kill すると
  // Swiper が opacity 0 のまま残るので、依存配列のある effect では消さない
  useEffect(
    () => () => {
      crossfadeRef.current?.kill();
    },
    []
  );

  return { placeholderRef, swiperWrapperRef, cardRefs };
}
