"use client";

import { useState } from "react";
import TopSection from "../../components/sections/TopSection";
import BackgroundStage from "../../components/webgl/BackgroundStage";
import LogoCarousel3D, { type LogoIcon } from "../../components/webgl/LogoCarousel3D";
import ScrollLock from "../../components/ui/ScrollLock";
import Loader from "../../components/ui/Loader";
import { usePageTransition } from "../../components/ui/PageTransition";

/**
 * トップの 3D 版（確認用）。本物のトップ（`app/page.tsx`）との違いは 2 つだけ。
 *
 * - 背景のハートを出さない（`BackgroundStage heart={false}`）
 * - 写真の Swiper ではなく、押し出した 3D ロゴを回転木馬のように並べる
 *
 * タイポのローダーから h1 へ縮む演出と、砂嵐ノイズの背景は本物と同じ。
 *
 * 本物の `sections/ProjectsIntoro` はハートの完了イベント（heart:complete）を
 * 待って動き出すが、このページはハートを出さないのでその合図が来ない。
 * ローダーの完了だけで 3D を出している。
 */

const ICONS: LogoIcon[] = [
  { title: "About", src: "/projects/RikuLogo.svg", path: "/project/about" },
  { title: "Works", src: "/projects/WorksLogo.svg", path: "/project/works" },
  { title: "Contact", src: "/projects/ContactLogo.svg", path: "/project/contact" },
];

export default function Top3DPage() {
  const [loaded, setLoaded] = useState(false);
  const { push } = usePageTransition();

  return (
    <>
      {/* トップは 1 画面で完結するのでスクロールさせない */}
      <ScrollLock />
      <TopSection />
      <BackgroundStage heart={false} />

      {/* 本物のトップと同じ h1。ローダーの文字がここへ縮んでくるので、
          id は揃えておく必要がある（ui/Loader が getElementById で引く） */}
      <h1
        id="site-title"
        className="pointer-events-none absolute inset-x-0 top-[88px] z-10 px-6 text-center
                   font-display text-[clamp(18px,3.2vw,34px)] leading-tight tracking-[0.14em]
                   text-white
                   [text-shadow:_0_0_18px_rgba(255,255,255,0.35),_0_0_40px_rgba(255,255,255,0.15)]"
      >
        Riku Ohashi Portfolio
      </h1>

      {!loaded && <Loader onFinish={() => setLoaded(true)} />}

      {loaded && (
        <div className="pointer-events-auto fixed inset-x-0 top-16 bottom-0 z-[5]">
          <LogoCarousel3D icons={ICONS} onSelect={(icon) => push(icon.path)} />
        </div>
      )}
    </>
  );
}
