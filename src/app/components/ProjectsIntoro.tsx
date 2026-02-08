"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import styles from "../styles/ProjectsSwiper.module.css";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { useRouter } from "next/navigation";
import { usePageTransition } from "./PageTransition";
import Loader from "./Loader";
import DistortOverlay from "./canvas/DistortOverlay";

type Project = { title: string; image: string; path: string };

const projects: Project[] = [
  { title: "About",   image: "/projects/project1.jpg", path: "/project/about" },
  { title: "Works",   image: "/projects/project2.jpg", path: "/project/works" },
  { title: "Contact", image: "/projects/project3.jpg", path: "/project/contact" },
];

export default function ProjectsIntro() {
  const [loaded, setLoaded] = useState(false);
  const [showSwiper, setShowSwiper] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const { push } = usePageTransition();

  // プレースホルダのルート&カード参照
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<HTMLDivElement[]>([]);

  // --- 初回アニメ（3→2→1 右→左、1だけ残す） ---
  useLayoutEffect(() => {
    if (!loaded || !placeholderRef.current) return;

    cardRefs.current = cardRefs.current.slice(0, projects.length);

    const ctx = gsap.context(() => {
      const cards = cardRefs.current.filter(Boolean);
      if (cards.length < 3) return;

      const W = window.innerWidth || 1;

      // 初期状態：右外 + 透明
      gsap.set(cards, {
         x: W,
         opacity: 0,
         willChange: "transform,opacity",
       });

      // 3枚目 → 2枚目 → 1枚目（残す）
      gsap
        .timeline({ defaults: { ease: "power1.inOut" } })
        // 3枚目
        .to(cards[2], { x: 0, opacity: 1, duration: 0.25 })
        .to(cards[2], { x: -W, opacity: 0, duration: 0.25 })
        // 2枚目
        .to(cards[1], { x: 0, opacity: 1, duration: 0.40 })
        .to(cards[1], { x: -W, opacity: 0, duration: 0.40 })
        // 1枚目（中央に残す）
        .to(cards[0], {
          x: 0,
          opacity: 1,
          duration: 0.45,
          ease: "power2.out",
          clearProps: "x,opacity,willChange",
        })
        .add(() => setShowSwiper(true), "-=0.1");
    }, placeholderRef);

    return () => ctx.revert();
  }, [loaded]);

  // --- Loader ---
  if (!loaded) {
    return (
      <Loader
        onFinish={() => setLoaded(true)}
      />
    );
  }

  // --- プレースホルダ（初回アニメ用） ---
  if (!showSwiper) {
    return (
      <>
        <div className={styles.projectsWrapper}>
          <div ref={placeholderRef} className={styles.swiperPlaceholder}>
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
        </div>

        {/* イントロ中は“少し強め”設定 */}
        <DistortOverlay
          key="intro"
          selector='img[data-distort]'
          strength={3} //ここで強さ変化
          speed={2}
          maxAmpPx={14}
          deadZonePx={0.9}
          damping={0.88}
        />
      </>
    );
  }

  // --- Swiper（切替後） ---
  return (
    <>
      <div className={styles.projectsWrapper}>
        <Swiper
          modules={[Autoplay, Navigation]}
          autoplay={{ delay: 3000, disableOnInteraction: false }}
          navigation
          loop
          centeredSlides
          slidesPerView={1}
          spaceBetween={30}
          speed={700}
          initialSlide={0}
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

      {/* 通常運転は“控えめ”設定 */}
      <DistortOverlay
        key="swiper"
        selector='img[data-distort]'
        strength={0.40}
        speed={0.65}
        maxAmpPx={10}
        deadZonePx={1.2}
        damping={0.92}
      />
    </>
  );
}
