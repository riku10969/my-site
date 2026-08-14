/**
 * ScrollLock
 *
 * マウントしている間だけページのスクロールを止める。トップページ用。
 *
 * トップは見えているものが全て position: fixed（背景の canvas、Projects の
 * カード、ローダー）で、流れに乗っているのは高さを確保するだけの
 * `sections/TopSection` しかない。スクロールできても中身が無いので止める。
 *
 * ルートを離れるとアンマウントされて元に戻るので、他のページには影響しない。
 */
"use client";

import { useLayoutEffect } from "react";

export default function ScrollLock() {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    // 直前の値を控えて戻す。モーダル側（HobbySection / CurtainModal）も
    // overflow を触るので、空文字で上書きせず元の値に復帰させる
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      overscroll: html.style.overscrollBehavior,
    };

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    // iOS でゴムのように引っ張られるのを抑える
    html.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.overscrollBehavior = prev.overscroll;
    };
  }, []);

  return null;
}
