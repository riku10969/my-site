"use client";

import { useEffect, useState } from "react";
import styles from "../../styles/ProjectsSwiper.module.css";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { usePageTransition } from "../ui/PageTransition";
import { useProjectsIntroReel } from "../gsap/ProjectsIntroReel";
import Loader from "../ui/Loader";
import DistortOverlay from "../webgl/DistortOverlay";

type Project = { title: string; image: string; path: string };

// 流れ順: Contact → Works → About（最後に About が中央で止まる）
const projects: Project[] = [
  { title: "Contact", image: "/projects/project3.webp", path: "/project/contact" },
  { title: "Works",   image: "/projects/project2.webp", path: "/project/works" },
  { title: "About",   image: "/projects/project1.webp", path: "/project/about" },
];

export default function ProjectsIntro() {
  const [loaded, setLoaded] = useState(false);
  const [heartComplete, setHeartComplete] = useState(false);
  const [showSwiper, setShowSwiper] = useState(false);
  const [hidePlaceholder, setHidePlaceholder] = useState(false);
  const [distortSettled, setDistortSettled] = useState(false); // とどまった直後のゆがみ切り替えを遅らせる
  const [activeIndex, setActiveIndex] = useState(0);
  const { push } = usePageTransition();
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
              navigation
              loop
              centeredSlides
              slidesPerView={1}
              spaceBetween={30}
              speed={700}
              initialSlide={2}
              onSlideChange={(s) => setActiveIndex(s.realIndex)}
            >
              {projects.map((p, i) => (
                <SwiperSlide key={i} className={styles["gsap-init"]}>
                  <div
                    className={styles.cardInitial}
                    onClick={() => push(p.path)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Swiper側の画像にも適用 */}
                    <img src={p.image} alt={p.title} data-distort />
                    <div className={styles.overlay}><span>{p.title}</span></div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
       
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
