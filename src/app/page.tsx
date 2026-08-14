import TopSection from "./components/sections/TopSection";
import ProjectsIntro from "./components/sections/ProjectsIntoro";
import BackgroundStage from "./components/webgl/BackgroundStage";
import ScrollLock from "./components/ui/ScrollLock";

export default function Page() {
  return (
    <>
      {/* トップは 1 画面で完結するのでスクロールさせない */}
      <ScrollLock />
      <TopSection />
      <BackgroundStage />

      {/* ページ見出し。
          TopSection の .top は z-index:0 でスタッキングコンテキストを作るため、
          その中に置くと後続の BackgroundStage の canvas に覆われて見えない。
          そこで BackgroundStage より後ろに置き z-10 で前面に出す。
          absolute（fixed ではない）なのでスクロールすると一緒に流れる。
          top-[88px] = 固定ヘッダー 64px + 余白 24px。背景のハートは
          画面の縦 20%〜78% を占めるので、その上の帯に収まる。

          id は ui/Loader が参照する。ローダーが出ている間は同じ文字が
          二重に見えるので隠し、タイプ演出の文字がここへ縮んできてから戻す。
          JS が動かない環境ではそのまま表示されるので実害はない。 */}
      <h1
        id="site-title"
        className="pointer-events-none absolute inset-x-0 top-[88px] z-10 px-6 text-center
                   font-display text-[clamp(18px,3.2vw,34px)] leading-tight tracking-[0.14em]
                   text-white
                   [text-shadow:_0_0_18px_rgba(255,255,255,0.35),_0_0_40px_rgba(255,255,255,0.15)]"
      >
        Riku Ohashi Portfolio
      </h1>

      <ProjectsIntro />
    </>
  );
}
