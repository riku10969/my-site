"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../../styles/ProjectsSwiper.module.css";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css";
// swiper/css/navigation は読まない。矢印は自前の <button> + SVG に置き換えてあり、
// これを読むと .swiper-button-* の既定（#007aff / 画面端 10px）が効いてしまう

import { usePageTransition } from "../ui/PageTransition";
import { useProjectsIntroReel } from "../gsap/ProjectsIntroReel";
import Loader from "../ui/Loader";
import DistortOverlay from "../webgl/DistortOverlay";

type Project = {
  title: string;
  image: string;
  path: string;
  /**
   * 画像の縦横比（幅 ÷ 高さ）。カードの箱をこの比率にして写真と一致させる。
   * ずれるとホバーのオーバーレイと影が写真からはみ出して枠に見えるので、
   * 画像を差し替えたらここも更新すること。
   */
  aspect: number;
};

// 流れ順: Contact → Works → About（最後に About が中央で止まる）
const projects: Project[] = [
  { title: "Contact", image: "/projects/project3.webp", path: "/project/contact", aspect: 1536 / 1024 },
  { title: "Works",   image: "/projects/project2.webp", path: "/project/works",   aspect: 1420 / 860 },
  { title: "About",   image: "/projects/project1.webp", path: "/project/about",   aspect: 1088 / 854 },
];

/** カードに比率を渡すための style */
const cardStyle = (p: Project) =>
  ({ ["--ar" as string]: String(p.aspect) }) as React.CSSProperties;

export default function ProjectsIntro() {
  const [loaded, setLoaded] = useState(false);
  const [heartComplete, setHeartComplete] = useState(false);
  const [showSwiper, setShowSwiper] = useState(false);
  const [hidePlaceholder, setHidePlaceholder] = useState(false);
  const [distortSettled, setDistortSettled] = useState(false); // とどまった直後のゆがみ切り替えを遅らせる
  const [activeIndex, setActiveIndex] = useState(0);
  const { push } = usePageTransition();
  // 送りボタン。Swiper に prevEl / nextEl として渡す
  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // イントロのリール演出とクロスフェードは gsap/ProjectsIntroReel に委譲。
  // マークアップ（カード / Swiper）はここに残るので ref を受け取る
  const { placeholderRef, swiperWrapperRef, cardRefs } = useProjectsIntroReel({
    cardCount: projects.length,
    ready: loaded && heartComplete && imagesLoaded,
    showSwiper,
    onReelComplete: () => setShowSwiper(true),
    onPlaceholderHidden: () => setHidePlaceholder(true),
  });

  // アニメーションで流れる画像を事前に読み込み・デコードする
  useEffect(() => {
    let active = true;
    const promises = projects.map((p) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.src = p.image;
        const onComplete = () => {
          if (active) resolve();
        };

        if (img.complete) {
          onComplete();
        } else {
          img.onload = () => {
            if (typeof img.decode === "function") {
              img.decode().then(onComplete).catch(onComplete);
            } else {
              onComplete();
            }
          };
          img.onerror = onComplete;
        }
      });
    });

    Promise.all(promises).then(() => {
      if (active) {
        setImagesLoaded(true);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  // ハート表示完了でスワイパーアニメ開始
  useEffect(() => {
    const onHeartComplete = () => setHeartComplete(true);
    window.addEventListener("heart:complete", onHeartComplete);
    return () => window.removeEventListener("heart:complete", onHeartComplete);
  }, []);

  // クロスフェード完了後にゆがみを弱くする（とどまった瞬間の変形を防ぐ）
  useEffect(() => {
    if (!hidePlaceholder) return;
    const t = setTimeout(() => setDistortSettled(true), 420);
    return () => clearTimeout(t);
  }, [hidePlaceholder]);

  // --- Loader ---
  if (!loaded) {
    return (
      <Loader
        onFinish={() => setLoaded(true)}
      />
    );
  }

  // --- プレースホルダ（初回アニメ）＋ クロスフェード時は上に重ねてからフェードアウト ---
  const isCrossfade = showSwiper && !hidePlaceholder;

  return (
    <>
      <div className={styles.projectsWrapper}>
        {(!showSwiper || !hidePlaceholder) && (
          <div
            ref={placeholderRef}
            className={styles.swiperPlaceholder}
            style={
              isCrossfade
                ? { position: "absolute", inset: 0, zIndex: 1 }
                : undefined
            }
          >
            {projects.map((p, i) => (
              <div
                key={i}
                className={styles.card}
                // 最初から画面外に逃がしておく。.card は opacity: 0 だが、
                // DistortOverlay は <img> の矩形に WebGL の面を貼るだけで CSS の
                // opacity を見ないため、中央に置いたままだと GSAP が動かし始める
                // 前（heart:complete 待ちの間）に画像が見えてしまう
                style={{
                  ...cardStyle(p),
                  transform: "translate(-50%, -50%) translateX(100vw)",
                }}
                ref={(el) => {
                  if (i === 0) cardRefs.current = []; // 先頭で初期化
                  if (el) cardRefs.current[i] = el;
                }}
              >
                {/* イントロ画像にも “ぐにゃ” を適用するためのフラグ */}
                <img src={p.image} alt={p.title} data-distort />
                <div className={styles.overlay}><span>{p.title}</span></div>
              </div>
            ))}
          </div>
        )}

        {showSwiper && (
          <div
            ref={swiperWrapperRef}
            className={styles.swiperWrapper}
            style={isCrossfade ? { position: "relative", zIndex: 0 } : undefined}
          >
            <Swiper
              modules={[Autoplay, Navigation]}
              autoplay={{ delay: 3000, disableOnInteraction: false }}
              navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
              /*
               * ref に入るのは React の commit 後で、Swiper の初期化がそれより先に
               * 走ることがある。navigation に prevRef.current をそのまま渡すだけだと
               * null が入って押しても効かないので、初期化の直前にここで差し込む。
               */
              onBeforeInit={(swiper) => {
                const nav = swiper.params.navigation;
                if (nav && typeof nav !== "boolean") {
                  nav.prevEl = prevRef.current;
                  nav.nextEl = nextRef.current;
                }
              }}
              loop
              centeredSlides
              slidesPerView={1}
              spaceBetween={30}
              speed={700}
              initialSlide={2}
              onSlideChange={(s) => setActiveIndex(s.realIndex)}
            >
              {projects.map((p, i) => (
                <SwiperSlide key={i}>
                  <div
                    className={styles.cardInitial}
                    onClick={() => push(p.path)}
                    style={{ ...cardStyle(p), cursor: "pointer" }}
                  >
                    {/* Swiper側の画像にも適用 */}
                    <img src={p.image} alt={p.title} data-distort />
                    <div className={styles.overlay}><span>{p.title}</span></div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* 送りボタン。字形はインライン SVG なので Web フォントに依存しない。
                意味は aria-label が持ち、SVG 自体は読み上げから外す */}
            <button
              type="button"
              ref={prevRef}
              className={`${styles.navBtn} ${styles.navPrev}`}
              aria-label="前の作品を見る"
              data-nav="prev"
            >
              <svg viewBox="0 0 24 24" aria-hidden focusable="false">
                <path d="M15 4 L7 12 L15 20" />
              </svg>
            </button>
            <button
              type="button"
              ref={nextRef}
              className={`${styles.navBtn} ${styles.navNext}`}
              aria-label="次の作品を見る"
              data-nav="next"
            >
              <svg viewBox="0 0 24 24" aria-hidden focusable="false">
                <path d="M9 4 L17 12 L9 20" />
              </svg>
            </button>
       
       <div
  className={`${styles.titleArea} ${
    activeIndex % 3 === 0
      ? "neon-cyan flicker"
      : activeIndex % 3 === 1
      ? "neon-purple flicker"
      : "neon-amber flicker"
  }`}
>
  {projects[activeIndex]?.title}
</div>
          </div>
        )}
      </div>

      {/* アニメ中はゆがみ強め、Swiper表示＋フェード落ち着いた後に弱く（一瞬変形を防ぐ） */}
      <DistortOverlay
        selector='img[data-distort]'
        strength={showSwiper && hidePlaceholder && distortSettled ? 0.40 : 4.5}
        speed={showSwiper && hidePlaceholder && distortSettled ? 0.65 : 2.6}
        maxAmpPx={showSwiper && hidePlaceholder && distortSettled ? 10 : 20}
        deadZonePx={showSwiper && hidePlaceholder && distortSettled ? 1.2 : 0.7}
        damping={showSwiper && hidePlaceholder && distortSettled ? 0.92 : 0.86}
      />
    </>
  );
}
