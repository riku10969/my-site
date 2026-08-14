/**
 * StrengthParallax
 *
 * Strength（私の強み）の全画面パララックス。`sections/AboutSection` から呼ばれる。
 *
 * ScrollTrigger の pin + scrub で 1 本の timeline を駆動する。
 * - start / end は trigger 自身の位置から refresh 時に測るので、/project/[slug] で
 *   About が 1〜3 番目のどこに来ても計算が変わらない。
 * - pin-spacer が先に高さを確保するため pin 開始時に文書が伸びず、以降のセクションが
 *   ずれない（自前 pin 実装の「ワープ」とその隠蔽用オーバーレイが不要になった理由）。
 * - scrub が双方向なので、上スクロール時の 03→02→01 の逆再生も自動で得られる。
 *
 * timeline の総尺は 1 に固定しているので、position 引数をそのまま progress として書ける。
 */
"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import GlitchText from "../ui/GlitchText";

gsap.registerPlugin(ScrollTrigger);

type Strength = { num: string; title: string; text: string };
type Pos = { top: string; left: string; w: string };

const MOBILE_BREAKPOINT = 768;

/** pin する長さ（ビューポート高の倍数）。Strength 1つあたり 1.5 画面 */
const PIN_SCROLL_VH = 1.5 * 3;

/** 常時表示する写真の枚数（0〜3）。残りは Strength ごとに PHOTOS_PER_STRENGTH 枚ずつ流れる */
const PERSISTENT_PHOTOS = 4;
const PHOTOS_PER_STRENGTH = 3;

/** 流れる写真のフェード時間（timeline 全体を 1 とした割合）と、下から上へ抜ける距離 */
const FLOW_FADE = 0.06;
const FLOW_PX = 56;

/** 常時表示の写真の揺れ・回転の往復回数。半周期 = 1 / (PULSE_CYCLES * 2) */
const PULSE_CYCLES = 3;

const strengths: Strength[] = [
  {
    num: "01",
    title: "適応力",
    text: "短期間で新しい環境に適応し、必要なスキルを吸収して成果につなげてきました。",
  },
  {
    num: "02",
    title: "メンタル",
    text: "職人時代の経験から、困難な状況でも冷静に対応できるメンタルがあります。",
  },
  {
    num: "03",
    title: "探求心",
    text: "新しい技術や手法に興味を持ち、学び続ける姿勢を持っています。",
  },
];

/** timeline 上での 1 Strength 分の長さと、テキストのフェード時間 */
const SEGMENT = 1 / strengths.length;
const TEXT_FADE = SEGMENT * 0.15;

/**
 * 写真13枚。0-3はパララックス中ずっと表示。4-12は Strength ごとに 3 枚ずつ、
 * 下から流れ込み・上に流れ出る（= PERSISTENT_PHOTOS + PHOTOS_PER_STRENGTH * strengths.length）。
 */
const photos = [
  "/RikuLogo3.webp",
  "/parallax/spacekelvin.webp",
  "/parallax/shark.webp",
  "/parallax/cowcowburger.webp",
  "/parallax/beach.webp",
  "/parallax/noise.webp",
  "/parallax/emo.webp",
  "/parallax/syokunin.webp",
  "/parallax/syokunin2.webp",
  "/parallax/syokunin3.webp",
  "/parallax/site.webp",
  "/parallax/07.webp",
  "/parallax/coding.webp",
];

// この4枚だけ罫線をつけない（RikuLogo3, spacekelvin, shark, cowcowburger）
const noBorderSlugs = ["RikuLogo3.webp", "spacekelvin.webp", "shark.webp", "cowcowburger.webp"];

// 罫線なし・画像全体表示（写真幅に合わせて contain）にする写真
const noBorderContainSlugs = [
  "RikuLogo3.webp",
  "spacekelvin.webp",
  "cowcowburger.webp",
  "shark.webp",
  "syokunin.webp",
  "beach.webp",
  "syokunin3.webp",
];

// 縦長アスペクト（画像に合わせて縦長表示）にする写真
const portraitSlugs: string[] = [];

// 13枚分の位置（デスクトップ）：0-3=常時表示、4-6=Strength1（散らす）、7-9=Strength2、10-12=Strength3（左中右バランス）
const desktopPos: Pos[] = [
  { top: "8%", left: "5%", w: "280px" },
  { top: "5%", left: "68%", w: "320px" },
  { top: "50%", left: "2%", w: "260px" },
  { top: "55%", left: "72%", w: "300px" },
  { top: "40%", left: "18%", w: "320px" },
  { top: "22%", left: "44%", w: "380px" },
  { top: "35%", left: "68%", w: "380px" },
  { top: "32%", left: "5%", w: "300px" },
  { top: "45%", left: "70%", w: "400px" },
  { top: "55%", left: "12%", w: "420px" },
  { top: "12%", left: "22%", w: "400px" },
  { top: "40%", left: "42%", w: "360px" },
  { top: "66%", left: "58%", w: "380px" },
];

// モバイル用：13枚（1の時は散らす、3の時はバランスよく）
const mobilePos: Pos[] = [
  { top: "12%", left: "2%", w: "90px" },
  { top: "16%", left: "70%", w: "100px" },
  { top: "65%", left: "0%", w: "85px" },
  { top: "70%", left: "68%", w: "95px" },
  { top: "32%", left: "12%", w: "95px" },
  { top: "32%", left: "60%", w: "140px" },
  { top: "63%", left: "62%", w: "150px" },
  { top: "27%", left: "8%", w: "90px" },
  { top: "38%", left: "58%", w: "150px" },
  { top: "60%", left: "18%", w: "115px" },
  { top: "25%", left: "18%", w: "150px" },
  { top: "42%", left: "38%", w: "150px" },
  { top: "68%", left: "54%", w: "150px" },
];

export default function StrengthParallax({ isLoaded = true }: { isLoaded?: boolean }) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const photoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        // isDesktop は本文では使わないが、gsap の matchMedia は「どの条件も
        // match しないとコールバックを呼ばない」ので、必ず片方が真になるように
        // ブレークポイントを排他な2本で書く必要がある
        isMobile: `(max-width: ${MOBILE_BREAKPOINT - 1}px)`,
        isDesktop: `(min-width: ${MOBILE_BREAKPOINT}px)`,
        reduce: "(prefers-reduced-motion: reduce)",
      },
      (mmCtx) => {
        const { isMobile, reduce } = mmCtx.conditions as {
          isMobile: boolean;
          reduce: boolean;
        };

        const photoEls = photoRefs.current;
        const textEls = textRefs.current;

        const posList = isMobile ? mobilePos : desktopPos;
        const depthBase = isMobile ? 80 : 150;
        const depthStep = isMobile ? 28 : 60;
        const swayPx = isMobile ? 14 : 28;

        // 動きを減らす設定では pin とクロスフェードだけ残し、移動・回転・拡縮・明滅をやめる
        const pulse = {
          duration: 1 / (PULSE_CYCLES * 2),
          ease: "sine.inOut",
          repeat: PULSE_CYCLES * 2 - 1,
          yoyo: true,
        };

        const tl = gsap.timeline({
          // immediateRender: false = 後ろに置いた fromTo が組み立て時に
          // 先頭の fromTo の初期値を上書きしてしまうのを防ぐ
          defaults: { ease: "none", immediateRender: false },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${window.innerHeight * PIN_SCROLL_VH}`,
            pin: true,
            anticipatePin: 1,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });

        // 総尺を 1 に固定する背骨
        tl.to({}, { duration: 1 }, 0);

        photoEls.forEach((el, i) => {
          if (!el) return;
          const p = posList[i];
          const inner = el.firstElementChild;

          // --- 常時表示の4枚：pin 中ずっと見えていて、スクロールで奥行き移動する。
          // 最後にフェードアウトはさせない（unpin 後にセクションごと流れて退場するので、
          // 消してしまうと Skill までの1画面が空っぽになる）
          if (i < PERSISTENT_PHOTOS) {
            const depth = depthBase + i * depthStep;
            const speed = (0.6 + (i % 3) * 0.2) * 1.4;

            // progress 0 の見た目を先に置いておく（timeline の初回描画までのちらつき防止）
            gsap.set(el, {
              top: p.top,
              left: p.left,
              width: p.w,
              opacity: 0.35,
              y: reduce ? 0 : depth,
              x: !reduce && i === 2 ? -swayPx : 0,
              scale: !reduce && i === 0 ? 0.88 : 1,
              rotation: 0,
              filter: !reduce && i === 3 ? "brightness(0.7)" : "none",
            });
            if (inner) gsap.set(inner, { opacity: !reduce && i === 3 ? 0.42 : 1 });

            tl.fromTo(el, { opacity: 0.35 }, { opacity: 1, duration: 0.08 }, 0);

            if (reduce) return;

            tl.fromTo(el, { y: depth }, { y: depth * (1 - speed), duration: 1 }, 0);

            if (i === 0) {
              tl.fromTo(el, { scale: 0.88 }, { scale: 1.12, ...pulse }, 0);
            } else if (i === 1) {
              tl.fromTo(el, { rotation: 0 }, { rotation: 360, duration: 1 }, 0);
            } else if (i === 2) {
              tl.fromTo(el, { x: -swayPx }, { x: swayPx, ...pulse }, 0);
            } else if (i === 3) {
              // 明滅。外側で brightness、内側で opacity を掛けて元の glow を再現する
              tl.fromTo(
                el,
                { filter: "brightness(0.7)" },
                { filter: "brightness(1.3)", ...pulse },
                0
              );
              if (inner) tl.fromTo(inner, { opacity: 0.42 }, { opacity: 1, ...pulse }, 0);
            }
            return;
          }

          // --- Strength ごとの3枚：担当セグメントで下から流れ込み、上へ抜ける
          gsap.set(el, {
            top: p.top,
            left: p.left,
            width: p.w,
            opacity: 0,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            filter: "none",
          });
          if (inner) gsap.set(inner, { opacity: 1 });

          const group = Math.floor((i - PERSISTENT_PHOTOS) / PHOTOS_PER_STRENGTH);
          const segStart = group * SEGMENT;
          const segEnd = segStart + SEGMENT;
          const flow = reduce ? 0 : FLOW_PX;

          tl.fromTo(
            el,
            { opacity: 0, y: flow },
            { opacity: 1, y: 0, duration: FLOW_FADE },
            segStart
          );

          // 最後のグループはそのまま残してセクションごと退場させる
          if (group < strengths.length - 1) {
            tl.fromTo(
              el,
              { opacity: 1, y: 0 },
              { opacity: 0, y: -flow, duration: FLOW_FADE },
              segEnd - FLOW_FADE
            );
          }
        });

        // Strength テキスト：autoAlpha で切り替える。非表示側は visibility: hidden に
        // なるので、支援技術とヒットテスト（テキスト選択）からも外れる。
        // 01 だけは pin 前から見えている（セクションが下から上がってくる間に読める）。
        // 最後の1枚はフェードアウトさせず、セクションごと流れて退場させる。
        textEls.forEach((el, i) => {
          if (!el) return;
          gsap.set(el, { autoAlpha: i === 0 ? 1 : 0 });

          const segStart = i * SEGMENT;
          const segEnd = segStart + SEGMENT;

          if (i > 0) {
            tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: TEXT_FADE }, segStart);
          }
          if (i < strengths.length - 1) {
            tl.fromTo(
              el,
              { autoAlpha: 1 },
              { autoAlpha: 0, duration: TEXT_FADE },
              segEnd - TEXT_FADE
            );
          }
        });
      }
    );

    // ブレークポイント切替時の作り直しと、ルート離脱時の pin-spacer 撤去を両方やる
    return () => mm.revert();
  }, []);

  return (
    <div
      ref={sectionRef}
      className="relative w-full h-screen bg-[#121316] overflow-hidden"
      style={{ isolation: "isolate" }}
      aria-label="Strength"
    >
      {/* タイトル（pin 中は position: fixed 相当の見え方になる。
          top-20 = 固定ヘッダー 64px を避ける） */}
      <div className="absolute top-20 md:top-24 inset-x-0 z-20 text-center px-2">
        <GlitchText
          text="Strength"
          variant="mono"
          className="text-[52px] sm:text-[68px] md:text-[96px] font-serif font-bold text-white
                     [text-shadow:_0_0_24px_rgba(255,255,255,0.4),_0_0_48px_rgba(255,255,255,0.2),_0_2px_4px_rgba(0,0,0,0.5)]"
          armed={isLoaded}
        />
        <p
          className="text-lg sm:text-xl md:text-2xl text-white/90 mt-2 font-medium
                     [text-shadow:_0_0_12px_rgba(255,255,255,0.25),_0_1px_2px_rgba(0,0,0,0.6)]"
        >
          私の強み
        </p>
      </div>

      {/* 写真（背景・装飾なので支援技術からは隠す） */}
      {photos.map((src, i) => {
        const slug = src.split("/").pop() ?? "";
        const noBorder = noBorderSlugs.includes(slug);
        const noBorderContain = noBorderContainSlugs.includes(slug);
        const isPortrait = portraitSlugs.includes(slug);
        const aspectClass = isPortrait ? "aspect-[3/4]" : "aspect-video";
        return (
          <div
            key={src}
            ref={(el) => {
              photoRefs.current[i] = el;
            }}
            className={`absolute overflow-hidden ${
              noBorder ? "" : "rounded-xl border border-white/30 shadow-xl"
            }`}
            style={{
              opacity: 0,
              zIndex: 2,
              backfaceVisibility: "hidden",
              pointerEvents: "none",
            }}
            aria-hidden
          >
            <div
              className={`w-full flex items-center justify-center ${
                noBorderContain ? "" : "h-full"
              }`}
            >
              {noBorderContain ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="w-full h-auto object-contain" />
              ) : (
                <div
                  className={`w-full ${aspectClass} bg-cover bg-center`}
                  style={{ backgroundImage: `url(${src})` }}
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Strengthテキスト（順番にフェードイン・フェードアウト） */}
      {strengths.map((s, i) => (
        <div
          key={s.num}
          ref={(el) => {
            textRefs.current[i] = el;
          }}
          className="absolute inset-0 flex items-center justify-center z-30"
          style={{
            opacity: i === 0 ? 1 : 0,
            visibility: i === 0 ? "visible" : "hidden",
          }}
        >
          <article className="max-w-3xl px-4 sm:px-6 md:max-w-4xl md:px-8">
            <div className="flex gap-4 sm:gap-6 md:gap-8">
              <span
                className="neon-cyan text-6xl sm:text-7xl md:text-8xl font-extrabold shrink-0 tracking-widest
                           [filter:drop-shadow(0_0_12px_rgba(44,205,185,0.6))]"
              >
                {s.num}
              </span>
              <div className="min-w-0">
                {/* 見出しレベルは AboutSection のプロフィール h2 直下なので h3。
                    文字サイズはクラス側で指定しているのでタグ変更の影響を受けない */}
                <h3
                  className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#c4a8ff]
                     [text-shadow:_0_0_14px_rgba(109,50,194,.6),_0_0_28px_rgba(109,50,194,.4),_0_0_48px_rgba(109,50,194,.25),_0_2px_4px_rgba(0,0,0,0.5)]"
                >
                  {s.title}
                </h3>
                <p
                  className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl text-white leading-8 sm:leading-9 md:leading-10 font-semibold
                     [text-shadow:_0_0_8px_rgba(255,255,255,0.15),_0_2px_4px_rgba(0,0,0,0.9)]"
                >
                  {s.text}
                </p>
              </div>
            </div>
          </article>
        </div>
      ))}
    </div>
  );
}
