"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const router = useRouter();
  const { push } = usePageTransition();
  const [imagesLoaded, setImagesLoaded] = useState(false);

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

  // プレースホルダのルート&カード参照
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const swiperWrapperRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<HTMLDivElement[]>([]);

  // --- 初回アニメ: 高速ループ → 徐々に遅く → Contact→Works→About で About が中央で止まる ---
  useLayoutEffect(() => {
    if (!loaded || !heartComplete || !imagesLoaded || !placeholderRef.current) return;

    cardRefs.current = cardRefs.current.slice(0, projects.length);

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
        .to({}, { duration: 0.22, onComplete: () => setShowSwiper(true) });
    }, placeholderRef);

    return () => ctx.revert();
  }, [loaded, heartComplete, imagesLoaded]);

  // --- プレースホルダ → Swiper の切り替え（重ねず順番に＝変形を防ぐ） ---
  useLayoutEffect(() => {
    if (!showSwiper || hidePlaceholder || !swiperWrapperRef.current || !placeholderRef.current) return;

    const placeholderEl = placeholderRef.current;
    const swiperEl = swiperWrapperRef.current;
    gsap.set(swiperEl, { opacity: 0 });
    const tl = gsap.timeline();
    // 1. アニメ用画像を先に完全にフェードアウト（スワイパー画像と重ならない）
    tl.to(placeholderEl, { opacity: 0, duration: 0.28, ease: "power2.in" });
    // 2. プレースホルダを DOM から外してからスワイパーをフェードイン
    tl.add(() => setHidePlaceholder(true));
    tl.to(swiperEl, { opacity: 1, duration: 0.28, ease: "power2.out" });
  }, [showSwiper, hidePlaceholder]);

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
