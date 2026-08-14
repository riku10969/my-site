/**
 * ZoomFlip
 *
 * タイル → 中央の拡大表示へモーフィングする開閉アニメーション。
 * `sections/HobbySection.tsx` のズームモーダルから呼ばれる。
 *
 * 旧実装から直したもの:
 * - `document.createElement("img")` のクローンと backdrop を body へ直接
 *   appendChild していた（React の管理外。閉じずに遷移すると次のページに
 *   position:fixed のまま残るので、専用の後片付け useEffect が必要だった）
 *   → 実要素を React が描画し、この hook は ref 経由で動かすだけにした
 * - Web Animations API で left / top / width / height を動かしていた
 *   （毎フレーム レイアウトが走る）→ Flip が transform に変換して動かす
 *
 * 呼び出し側は返された ref を「背景」「画像」「文言＋閉じるボタン」に付けるだけ。
 * 画像はクリップされない独立レイヤーに置くこと（パネル内に入れると
 * overflow: hidden でタイル位置まで縮む途中が切られる）。
 */
"use client";

import { useCallback, useRef } from "react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(Flip);

/** cubic-bezier(0.33, 1, 0.68, 1) 相当（easeOutCubic） */
const EASE = "power2.out";
const DURATION_OPEN = 0.42;
const DURATION_CLOSE = 0.38;
const DURATION_BACKDROP = 0.28;
/** 画像が開ききる少し手前で文言を出す */
const CHROME_IN_AT = 0.3;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function useZoomFlip(originEl: HTMLElement | null) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const chromeRef = useRef<HTMLDivElement | null>(null);
  const animatingRef = useRef(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  /** 開いた状態の見た目を即座に作る（アニメーションなしの経路と完了時で共用） */
  const settleOpen = useCallback(() => {
    const img = imageRef.current;
    if (img) gsap.set(img, { x: 0, y: 0, scaleX: 1, scaleY: 1 });
    gsap.set([backdropRef.current, chromeRef.current].filter(Boolean), {
      autoAlpha: 1,
    });
  }, []);

  /**
   * @param onOpened 開ききった時点で呼ばれる。文言レイヤーは autoAlpha で
   *   visibility: hidden になっており、その間は閉じるボタンにフォーカスできないので、
   *   フォーカス移動はこのタイミングに合わせる
   */
  const playOpen = useCallback(
    (onOpened?: () => void) => {
    const img = imageRef.current;
    const backdrop = backdropRef.current;
    const chrome = chromeRef.current;
    if (!img || !backdrop || !chrome) return;

    tlRef.current?.kill();

    if (!originEl || prefersReducedMotion()) {
      settleOpen();
      animatingRef.current = false;
      onOpened?.();
      return;
    }

    animatingRef.current = true;
    gsap.set([backdrop, chrome], { autoAlpha: 0 });
    // 2回目以降に前回の transform が残っていても正しい最終位置を記録できるようにする
    gsap.set(img, { x: 0, y: 0, scaleX: 1, scaleY: 1 });

    // 最終位置を記録 → タイルへ重ねる → 記録した位置へ戻す
    const target = Flip.getState(img);
    Flip.fit(img, originEl, { scale: true });

    const tl = gsap.timeline({
      onComplete: () => {
        animatingRef.current = false;
        onOpened?.();
      },
    });
    tlRef.current = tl;
    tl.to(backdrop, { autoAlpha: 1, duration: DURATION_BACKDROP, ease: EASE }, 0)
      .add(Flip.to(target, { duration: DURATION_OPEN, ease: EASE, scale: true }), 0)
      .to(chrome, { autoAlpha: 1, duration: 0.22, ease: EASE }, CHROME_IN_AT);
    },
    [originEl, settleOpen]
  );

  const playClose = useCallback(
    (onDone: () => void) => {
      const img = imageRef.current;
      const backdrop = backdropRef.current;
      const chrome = chromeRef.current;

      tlRef.current?.kill();

      if (!img || !backdrop || !chrome || !originEl || prefersReducedMotion()) {
        animatingRef.current = false;
        onDone();
        return;
      }

      animatingRef.current = true;

      const tl = gsap.timeline({
        onComplete: () => {
          animatingRef.current = false;
          onDone();
        },
      });
      tlRef.current = tl;

      // Flip.fit は duration を渡したときだけ Tween を返す（無いと即座に位置を合わせて null）
      const shrink = Flip.fit(img, originEl, {
        scale: true,
        duration: DURATION_CLOSE,
        ease: EASE,
      }) as gsap.core.Tween | null;
      if (shrink) tl.add(shrink, 0);

      tl.to(chrome, { autoAlpha: 0, duration: 0.18, ease: EASE }, 0).to(
        backdrop,
        { autoAlpha: 0, duration: DURATION_BACKDROP, ease: EASE },
        0.1
      );
    },
    [originEl]
  );

  /** 開閉アニメーション中か。連打で閉じ処理が二重に走るのを防ぐ */
  const isAnimating = useCallback(() => animatingRef.current, []);

  /** モーダルがアンマウントされるときに呼ぶ */
  const dispose = useCallback(() => {
    tlRef.current?.kill();
    tlRef.current = null;
    animatingRef.current = false;
  }, []);

  return { backdropRef, imageRef, chromeRef, playOpen, playClose, isAnimating, dispose };
}
