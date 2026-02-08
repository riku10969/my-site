"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import GlitchText from "../GlitchText";
import SkillBarsAbout from "../SkillBarsAbout";
import HobbySection from "../HobbySection";

type Strength = { num: string; title: string; text: string };
type Pos = { top: string; left: string; w: string };

export default function AboutSection({ isLoaded = true }: { isLoaded?: boolean }) {
  const imgRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [imgWarpOn, setImgWarpOn] = useState(false);
  const [parallaxProgress, setParallaxProgress] = useState(0);
  
  // Strengthパララックス用のrefs
  const strengthWrapperRef = useRef<HTMLDivElement | null>(null);
  const strengthSectionRef = useRef<HTMLDivElement | null>(null);
  const strengthTitleRef = useRef<HTMLDivElement | null>(null); // unpin時は非表示にして下のセクションを覆わない
  const strengthRefs = useRef<(HTMLDivElement | null)[]>([]);
  const photoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeStrengthIndex, setActiveStrengthIndex] = useState(-1);
  const isPinnedRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const pinStartRef = useRef<number | null>(null);
  const originalHeightRef = useRef<number | null>(null);
  const wasSectionOutRef = useRef(false); // セクションが一度ビューポート外に出たか
  const enteredFromBottomRef = useRef(false); // 下から入ったか（上スクロール時）
  const hasUnpinnedAfterCompleteRef = useRef(false); // progress>=1で解除した直後は再pinしない
  const lastCompletelyOutAtRef = useRef<number | null>(null); // セクションがビューポート外になった時刻（1.5秒以上外なら再pin許可）
  const smoothedProgressRef = useRef(0); // 表示用の補間済みprogress（速スクロールで飛ばない）
  const rafLoopRef = useRef<number | null>(null); // pin中は毎フレーム補間を更新するループ用
  const skillHobbyWrapperRef = useRef<HTMLDivElement | null>(null); // Skill/Hobby直前でパララックス終了判定用
  const [strengthAccordionOpen, setStrengthAccordionOpen] = useState(false);
  const strengthAccordionOpenRef = useRef(false); // applyStrengthParallax から参照（パネル未表示時はパララックス無効）
  const strengthPanelRef = useRef<HTMLDivElement | null>(null);

  const strengths: Strength[] = useMemo(
    () => [
      {
        num: "01",
        title: "適応力",
        text: "短期間で新しい環境に適応し、必要なスキルを吸収して成果につなげてきました。",
      },
      {
        num: "02",
        title: "メンタル",
        text: "厳しい現場経験から、困難な状況でも冷静に対応できる強いメンタルがあります。",
      },
      {
        num: "03",
        title: "技術力",
        text: "FigmaからReact/Next.jsまで一貫して設計・実装できるフロントエンド力。",
      },
    ],
    []
  );

  // 写真を9枚に拡張（HobbySectionの写真を使いまわし）
  const photos = useMemo(
    () => [
      "/RikuLogo3.png",
      "/parallax/spacekelvin.png",
      "/parallax/coding.png",
      "/hobby/snow.jpg",
      "/hobby/car.jpg",
      "/parallax/shark.png",
      "/hobby/figaro.jpg",
      "/hobby/camera.jpg",
      "/parallax/cowcowburger.png",
    ],
    []
  );

  // 罫線なし・画像全体表示（contain）にする写真
  const noBorderContainSlugs = useMemo(
    () => ["RikuLogo3.png", "cowcowburger.png", "shark.png", "spacekelvin.png"],
    []
  );
  const MOBILE_BREAKPOINT = 768;

  // 9枚分の位置（デスクトップ）
  const desktopPos: Pos[] = useMemo(
    () => [
      { top: "5%", left: "2%", w: "340px" },
      { top: "3%", left: "62%", w: "460px" },
      { top: "18%", left: "25%", w: "320px" },
      { top: "32%", left: "5%", w: "300px" },
      { top: "45%", left: "70%", w: "400px" },
      { top: "55%", left: "12%", w: "420px" },
      { top: "8%", left: "85%", w: "260px" },
      { top: "38%", left: "50%", w: "340px" },
      { top: "66%", left: "72%", w: "440px" },
    ],
    []
  );

  // モバイル用：写真を小さく・配置を詰める
  const mobilePos: Pos[] = useMemo(
    () => [
      { top: "4%", left: "2%", w: "100px" },
      { top: "2%", left: "58%", w: "120px" },
      { top: "14%", left: "22%", w: "95px" },
      { top: "28%", left: "4%", w: "90px" },
      { top: "42%", left: "62%", w: "110px" },
      { top: "52%", left: "8%", w: "115px" },
      { top: "6%", left: "78%", w: "85px" },
      { top: "34%", left: "48%", w: "100px" },
      { top: "62%", left: "68%", w: "118px" },
    ],
    []
  );

  // 画像が一度だけ画面に入ったら歪み演出ON
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImgWarpOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    strengthAccordionOpenRef.current = strengthAccordionOpen;
  }, [strengthAccordionOpen]);

  // Strengthパララックス効果を適用する関数
  const applyStrengthParallax = useCallback(() => {
    if (!strengthSectionRef.current || !strengthWrapperRef.current) return;
    if (!strengthAccordionOpenRef.current) {
      if (isPinnedRef.current) {
        isPinnedRef.current = false;
        pinStartRef.current = null;
        const wrapper = strengthWrapperRef.current;
        const section = strengthSectionRef.current;
        if (wrapper) {
          wrapper.style.height = "auto";
          wrapper.style.zIndex = "0";
        }
        if (section) {
          section.style.position = "relative";
          section.style.top = "auto";
          section.style.left = "auto";
          section.style.zIndex = "0";
        }
        if (strengthTitleRef.current) {
          strengthTitleRef.current.style.visibility = "hidden";
          strengthTitleRef.current.style.pointerEvents = "none";
        }
      }
      return;
    }

    const section = strengthSectionRef.current;
    const wrapper = strengthWrapperRef.current;
    const viewportHeight = window.innerHeight;

    // アンカー要素の位置を取得
    const anchor = document.querySelector("#strength-start-anchor");
    if (!anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    const anchorTop = anchorRect.top;
    const sectionHeight = section.offsetHeight;

    // pin用のスクロール範囲（先に計算）
    const baseScrollRange = viewportHeight * strengths.length * 1.5;
    const extraSpace = viewportHeight * 0.3;
    const pinScrollRange = baseScrollRange + extraSpace;

    // パララックス範囲を Skill/Hobby 直前までに制限。Skill が表示される前に終わらせるため、少し手前（80px）で unpin。
    const skillHobbyEl = skillHobbyWrapperRef.current;
    let skillHobbyInView = false;
    const SKILL_HOBBY_BUFFER_PX = 80; // Skill が画面に入るこの px 手前でパララックス終了
    if (skillHobbyEl) {
      const skillHobbyRect = skillHobbyEl.getBoundingClientRect();
      skillHobbyInView = skillHobbyRect.top < viewportHeight + SKILL_HOBBY_BUFFER_PX;
    }

    // アンカーが画面上端に来たらpin。解除直後だけ再pinしない（以降のセクションを隠さない）
    const shouldPin = anchorTop <= 0 && !hasUnpinnedAfterCompleteRef.current;

    // pin状態の管理
    if (shouldPin && !isPinnedRef.current) {
      isPinnedRef.current = true;
      originalHeightRef.current = wrapper.offsetHeight;
      wrapper.style.height = `${originalHeightRef.current + pinScrollRange}px`;

      // 下から入ったか（上スクロールでセクションが戻ってきた）→ progress 1 から開始
      if (wasSectionOutRef.current) {
        enteredFromBottomRef.current = true;
        pinStartRef.current = window.scrollY - pinScrollRange; // progress が 1 から始まる
        wasSectionOutRef.current = false;
      } else {
        enteredFromBottomRef.current = false;
        pinStartRef.current = window.scrollY;
      }

      section.style.position = "fixed";
      section.style.top = "0";
      section.style.left = "0";
      section.style.width = "100%";
      section.style.zIndex = "10";
      wrapper.style.zIndex = "10";
      smoothedProgressRef.current = enteredFromBottomRef.current ? 1 : 0;
      if (strengthTitleRef.current) {
        strengthTitleRef.current.style.visibility = "";
        strengthTitleRef.current.style.pointerEvents = "";
      }
    } else if (!shouldPin && isPinnedRef.current) {
      isPinnedRef.current = false;
      pinStartRef.current = null;
      wrapper.style.height = "auto";
      wrapper.style.zIndex = "0";
      section.style.position = "relative";
      section.style.top = "auto";
      section.style.left = "auto";
      section.style.zIndex = "0";
      if (strengthTitleRef.current) {
        strengthTitleRef.current.style.visibility = "hidden";
        strengthTitleRef.current.style.pointerEvents = "none";
      }
    }

    // セクションが完全にビューポート外に出たかチェック
    const sectionRect = section.getBoundingClientRect();
    const isCompletelyOut = sectionRect.top > viewportHeight || sectionRect.bottom < 0;

    if (isCompletelyOut) {
      wasSectionOutRef.current = true;
      if (lastCompletelyOutAtRef.current === null) {
        lastCompletelyOutAtRef.current = Date.now();
      }
      const OUT_VIEW_COOLDOWN_MS = 1500;
      if (Date.now() - (lastCompletelyOutAtRef.current ?? 0) >= OUT_VIEW_COOLDOWN_MS) {
        hasUnpinnedAfterCompleteRef.current = false; // 1.5秒以上外なら次回pin可能（SkillBarsAbout表示時はパララックス確実に終了済み）
      }
      if (isPinnedRef.current) {
        isPinnedRef.current = false;
        pinStartRef.current = null;
        wrapper.style.zIndex = "0";
        section.style.position = "relative";
        section.style.top = "auto";
        section.style.left = "auto";
        section.style.zIndex = "0";
        if (strengthTitleRef.current) {
          strengthTitleRef.current.style.visibility = "hidden";
          strengthTitleRef.current.style.pointerEvents = "none";
        }
      }
      if (wrapper.style.height !== "auto") {
        wrapper.style.height = "auto";
      }

      photoRefs.current.forEach((el) => {
        if (el) {
          el.style.opacity = "0";
          el.style.transform = "translate3d(0, 0, 0)";
          el.style.filter = "";
          el.style.pointerEvents = "none";
        }
      });

      strengthRefs.current.forEach((el) => {
        if (el) {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
        }
      });

      setActiveStrengthIndex(-1);
      return;
    }

    lastCompletelyOutAtRef.current = null; // 画面内にいる間はリセット

    // pin前でもセクションが画面内なら最初のStrengthと写真を表示（黒画面を防ぐ）
    if (!isPinnedRef.current) {
      const inView =
        sectionRect.top < viewportHeight && sectionRect.bottom > 0;
      // 上スクロールでStrengthが下から入ってきた（Skill/Hobby直後）→ 再pin許可して03→02→01の逆パララックス
      if (inView && sectionRect.top > 0) {
        hasUnpinnedAfterCompleteRef.current = false;
      }
      if (inView) {
        strengthRefs.current.forEach((el, i) => {
          if (el) {
            el.style.opacity = i === 0 ? "1" : "0";
            el.style.pointerEvents = i === 0 ? "auto" : "none";
          }
        });
        photoRefs.current.forEach((el) => {
          if (el) {
            el.style.opacity = "0.4";
            el.style.transform = "translate3d(0, 0, 0)";
            el.style.filter = "";
            el.style.pointerEvents = "auto";
          }
        });
      }
      return;
    }

    if (pinStartRef.current === null) return;

    const currentScroll = window.scrollY - pinStartRef.current;
    const pinProgress = Math.max(0, Math.min(1, currentScroll / pinScrollRange));

    // 表示用progressを補間（速スクロールで一気に飛ばない）
    const SMOOTH_FACTOR = 0.22;
    smoothedProgressRef.current +=
      (pinProgress - smoothedProgressRef.current) * SMOOTH_FACTOR;
    const displayProgress = smoothedProgressRef.current;

    // Skill/Hobby が画面に入ったら強制 unpin（ただし pin 直後は閉じない＝パララックスが動く前にアコーディオンが閉じないようにする）
    const DISPLAY_CATCHUP_THRESHOLD = 0.88;
    const MIN_PROGRESS_BEFORE_SKILL_UNPIN = 0.2; // パララックスを 20% 以上スクロールしたときだけ Skill 進入で unpin
    if (skillHobbyInView && isPinnedRef.current && pinProgress >= MIN_PROGRESS_BEFORE_SKILL_UNPIN) {
      hasUnpinnedAfterCompleteRef.current = true;
      const startY = pinStartRef.current;
      isPinnedRef.current = false;
      pinStartRef.current = null;
      wrapper.style.height = "auto";
      wrapper.style.zIndex = "0";
      section.style.position = "relative";
      section.style.top = "auto";
      section.style.left = "auto";
      section.style.zIndex = "0";
      if (strengthTitleRef.current) {
        strengthTitleRef.current.style.visibility = "hidden";
        strengthTitleRef.current.style.pointerEvents = "none";
      }
      // アコーディオン閉じで高さが減るので、閉じたあとの見え方に合わせてスクロール（下ワープを防ぐ）
      const targetScroll = Math.max(0, (startY ?? 0) - 60);
      window.scrollTo(0, targetScroll);
      photoRefs.current.forEach((el) => {
        if (el) {
          el.style.opacity = "0";
          el.style.transform = "translate3d(0, 0, 0)";
          el.style.pointerEvents = "none";
        }
      });
      strengthRefs.current.forEach((el) => {
        if (el) {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
        }
      });
      setActiveStrengthIndex(-1);
      setStrengthAccordionOpen(false);
      return;
    }

    // 下スクロールで progress 1 に到達したらpin解除（表示が追いついてから解除＝速スクロールでも見える）
    if (!enteredFromBottomRef.current && pinProgress >= 1) {
      if (displayProgress >= DISPLAY_CATCHUP_THRESHOLD) {
        hasUnpinnedAfterCompleteRef.current = true;
        const startY = pinStartRef.current;
        isPinnedRef.current = false;
        pinStartRef.current = null;
        wrapper.style.height = "auto";
        wrapper.style.zIndex = "0";
        section.style.position = "relative";
        section.style.top = "auto";
        section.style.left = "auto";
        section.style.zIndex = "0";
        if (strengthTitleRef.current) {
          strengthTitleRef.current.style.visibility = "hidden";
          strengthTitleRef.current.style.pointerEvents = "none";
        }
        // アコーディオン閉じで高さが減るので、閉じたあとの見え方に合わせてスクロール（下ワープを防ぐ）
        const targetScroll = Math.max(0, (startY ?? 0) - 60);
        window.scrollTo(0, targetScroll);

      photoRefs.current.forEach((el) => {
        if (el) {
          el.style.opacity = "0";
          el.style.transform = "translate3d(0, 0, 0)";
          el.style.filter = "";
          el.style.pointerEvents = "none";
        }
      });
      strengthRefs.current.forEach((el) => {
        if (el) {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
        }
      });
      setActiveStrengthIndex(-1);
      setStrengthAccordionOpen(false);
      return;
    }
      // まだ表示が追いついていない → このフレームは解除せず、下のパララックス適用を続行
    }

    // 上スクロールで progress 0 に到達したらpin解除（同様に表示が追いついてから）
    if (enteredFromBottomRef.current && pinProgress <= 0) {
      if (displayProgress <= 1 - DISPLAY_CATCHUP_THRESHOLD) {
        isPinnedRef.current = false;
        pinStartRef.current = null;
        enteredFromBottomRef.current = false;
        wrapper.style.height = "auto";
        wrapper.style.zIndex = "0";
        section.style.position = "relative";
        section.style.top = "auto";
        section.style.left = "auto";
        section.style.zIndex = "0";
        if (strengthTitleRef.current) {
          strengthTitleRef.current.style.visibility = "hidden";
          strengthTitleRef.current.style.pointerEvents = "none";
        }

        photoRefs.current.forEach((el) => {
          if (el) {
            el.style.opacity = "0";
            el.style.transform = "translate3d(0, 0, 0)";
            el.style.filter = "";
            el.style.pointerEvents = "none";
          }
        });
        strengthRefs.current.forEach((el) => {
          if (el) {
            el.style.opacity = "0";
            el.style.pointerEvents = "none";
          }
        });
        setActiveStrengthIndex(-1);
        return;
      }
    }

    // 写真のパララックス効果（表示用は補間済みdisplayProgressで滑らかに）
    const totalPhotos = photos.length;
    const isReverse = enteredFromBottomRef.current;

    // 4枚（rikuLogo3, spacekelvin, shark, cowcowburger）は少し早めに移動
    const earlyMoveIndices = [0, 1, 5, 8];
    const speedMultiplier = (i: number) =>
      earlyMoveIndices.includes(i) ? 1.4 : 1;

    const isMobile = typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
    const depthBase = isMobile ? 80 : 150;
    const depthStep = isMobile ? 28 : 60;
    const swayPx = isMobile ? 14 : 28;

    photoRefs.current.forEach((el, i) => {
      if (!el) return;

      const depth = depthBase + i * depthStep;
      let yOffset = 0;
      let opacity = 1;
      const parallaxSpeed =
        (0.6 + (i % 3) * 0.2) * speedMultiplier(i);

      if (isReverse) {
        yOffset = depth * (displayProgress * parallaxSpeed);
      } else {
        yOffset = depth * (1 - displayProgress * parallaxSpeed);
      }

      if (displayProgress < 0.1) {
        opacity = Math.max(0.35, Math.min(1, displayProgress / 0.08));
      } else if (displayProgress > 0.9) {
        opacity = Math.max(0, (1 - displayProgress) / 0.1);
      } else {
        opacity = 1;
      }

      const progress = displayProgress;
      const T = Math.PI * 2;
      let transform = `translate3d(0, ${yOffset}px, 0)`;

      if (i === 0) {
        // rikuLogo3: スクロールに合わせて大きくなったり小さくなったり
        const scale = 0.88 + 0.24 * (1 + Math.sin(progress * T * 3)) / 2;
        transform += ` scale(${scale})`;
      } else if (i === 1) {
        // spacekelvin: スクロールに合わせて回転
        transform += ` rotate(${progress * 360}deg)`;
      } else if (i === 5) {
        // shark: スクロールに合わせて左右に揺れる
        transform += ` translateX(${swayPx * Math.sin(progress * T * 3)}px)`;
      } else if (i === 8) {
        // cowcowburger: スクロールに合わせて光ったり消えたり
        const glow = 0.42 + 0.58 * (1 + Math.sin(progress * T * 3)) / 2;
        opacity *= glow;
      }

      el.style.transform = transform;
      el.style.opacity = opacity.toString();
      if (i === 8) {
        el.style.filter = `brightness(${0.7 + 0.6 * (1 + Math.sin(progress * T * 3)) / 2})`;
      } else {
        el.style.filter = "";
      }
      el.style.willChange = "transform, opacity";
      el.style.pointerEvents = opacity > 0.1 ? "auto" : "none";
    });

    // テキストの表示制御（表示用はdisplayProgressで滑らかに）
    const textDuration = 1 / strengths.length;

    strengths.forEach((_, i) => {
      const el = strengthRefs.current[i];
      if (!el) return;

      const textStart = i * textDuration;
      const textEnd = textStart + textDuration;
      const fadeDuration = 0.15;

      let opacity = 0;

      if (displayProgress >= textStart && displayProgress < textEnd) {
        const localProgress = (displayProgress - textStart) / textDuration;

        if (localProgress < fadeDuration) {
          opacity = i === 0 && displayProgress < 0.02 ? 1 : localProgress / fadeDuration;
        } else if (localProgress < 1 - fadeDuration) {
          opacity = 1;
        } else {
          opacity = Math.max(0, (1 - localProgress) / fadeDuration);
        }
      }

      el.style.opacity = opacity.toString();
      el.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
      el.style.willChange = "opacity";

      if (opacity > 0.5) {
        setActiveStrengthIndex(i);
      }
    });
  }, [strengths, photos]);

  // 写真の位置・サイズを画面幅に応じて適用（モバイルは小さく）
  const applyPhotoLayout = useCallback(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
    const posList = isMobile ? mobilePos : desktopPos;
    photoRefs.current.forEach((el, i) => {
      if (!el) return;
      const p = posList[i];
      el.style.position = "absolute";
      el.style.top = p.top;
      el.style.left = p.left;
      el.style.width = p.w;
      el.style.transform = "translate3d(0, 0, 0)";
      el.style.opacity = "0";
      el.style.filter = "";
      el.style.willChange = "transform, opacity";
      el.style.pointerEvents = "none";
      el.style.zIndex = "2";
    });
  }, [desktopPos, mobilePos]);

  // Strengthパララックスのスクロールイベントハンドラー
  useEffect(() => {
    const wrapper = strengthWrapperRef.current;
    const section = strengthSectionRef.current;
    if (wrapper) {
      wrapper.style.height = "";
      wrapper.style.zIndex = "";
    }
    if (section) {
      section.style.position = "";
      section.style.top = "";
      section.style.left = "";
      section.style.zIndex = "";
    }

    const handleScroll = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        applyStrengthParallax();
      });
    };

    const handleResize = () => {
      applyPhotoLayout();
      handleScroll();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    // 初期配置（モバイルなら小さく）
    applyPhotoLayout();

    strengthRefs.current.forEach((el) => {
      if (el) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        el.style.willChange = "opacity";
      }
    });

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [applyStrengthParallax, applyPhotoLayout]);

  // pin中は毎フレーム補間を更新（スクロール停止後も表示が目標に追いつく）
  useEffect(() => {
    const loop = () => {
      if (isPinnedRef.current) applyStrengthParallax();
      rafLoopRef.current = requestAnimationFrame(loop);
    };
    rafLoopRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafLoopRef.current != null) cancelAnimationFrame(rafLoopRef.current);
    };
  }, [applyStrengthParallax]);

  // 通常のパララックス効果の計算（ヒーローエリア用）
  useEffect(() => {
    let rafId: number | null = null;

    const handleScroll = () => {
      if (!sectionRef.current) return;

      rafId = requestAnimationFrame(() => {
        const rect = sectionRef.current?.getBoundingClientRect();
        if (!rect) return;

        const vh = window.innerHeight;
        const scrollY = window.scrollY;

        const sectionTop = scrollY + rect.top;
        const startOffset = sectionTop - vh * 0.5;
        const progress = Math.max(0, Math.min(1, (scrollY - startOffset) / (vh * 2)));

        setParallaxProgress(progress);
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // パララックスオフセット計算（ヒーローエリア用）
  const heroOffsetY = parallaxProgress * -60; // スクロールに合わせて上に移動

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#121316] text-white"
    >
      <div className="w-full max-w-[1600px] mx-auto px-6 md:px-10 lg:px-14 pt-24 pb-14">
        {/* ===============================
            ビジュアル + 名前
           =============================== */}
        <div
          className="flex flex-col items-center"
          style={{
            transform: `translateY(${heroOffsetY}px)`,
            willChange: "transform",
          }}
        >
          <div
            ref={imgRef}
            className={[
              "warp-image",
              "w-[80%] mx-auto",
              "max-w-[1600px] rounded-xl overflow-hidden bg-[#e9ebee]",
              "h-[260px] sm:h-[320px] md:h-[520px] lg:h-[620px]",
              imgWarpOn ? "warp-on" : "",
            ].join(" ")}
            style={
              {
                ["--img" as any]: "url(/projects/project1.jpg)",
              } as React.CSSProperties
            }
            aria-label="About visual"
            role="img"
          />

          <GlitchText
            key={`imgname-${isLoaded ? "on" : "off"}`}
            as="div"
            text="Riku Ohashi"
            delaySec={0.55}
            className="font-serif mt-4 text-[44px] md:text-[50px] tracking-[0.12em] text-white/90"
            trigger="scroll"
            armed={isLoaded}
          />
        </div>

        {/* ===============================
            プロフィール
           =============================== */}
        <h2 className="mt-12 text-[20px] md:text-[22px] font-semibold">
          <GlitchText
            key={`profile-${isLoaded ? "on" : "off"}`}
            as="span"
            text="大橋 陸　1999年生まれ、埼玉県出身"
            delaySec={1}
            trigger="scroll"
            armed={isLoaded}
          />
        </h2>

        <p className="mt-4 px-2 sm:px-0 text-[15px] sm:text-[17px] md:text-[20px] leading-7 sm:leading-8 md:leading-8 text-[#d6d8de] max-w-[1100px]">
          高校卒業後、職人として現場で働いた経験から、丁寧さと粘り強さを大切にする姿勢を培いました。
          その後、フロントエンドエンジニアとして実務を経験し、Reactを中心にWebサイトの開発を担当。
          デジリグに入校してデザインを体系的に学び、現在は
          <strong className="text-white">「デザイン × 実装」</strong>
          の両面から提案することが可能です。
          ユーザーにとって直感的で心地よい体験を生み出すことを目指しています。
        </p>
      </div>

      {/* ===============================
          Strength（中央ボタンでパララックス表示・pin）
         =============================== */}
      <div className="mt-12 flex justify-center">
        <button
          type="button"
          onClick={() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setStrengthAccordionOpen(true);
              });
            });
            setTimeout(() => {
              document.getElementById("strength-start-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 420);
          }}
          aria-expanded={strengthAccordionOpen}
          aria-controls="strength-parallax-panel"
          className="rounded-xl border px-6 py-3 md:px-8 md:py-4 text-xl md:text-3xl font-serif font-bold text-white
                     transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out
                     border-[#A855F7]/40 bg-[#2ccdb9]/15
                     hover:border-[#A855F7]/50 hover:bg-[#A855F7]/25 hover:shadow-[0_0_24px_rgba(168,85,247,0.25)]
                     active:scale-[0.98]
                     backdrop-blur-sm
                     [text-shadow:_0_0_20px_rgba(255,255,255,0.3),_0_1px_2px_rgba(0,0,0,0.5)]"
        >
          <GlitchText as="span" text="My Strength" trigger="manual" replayOnHover={true} />
        </button>
      </div>

      <div className="mt-0">
        <div
          ref={strengthPanelRef}
          id="strength-parallax-panel"
          role="region"
          aria-label="Strength パララックス"
          className="overflow-hidden"
          style={{
            maxHeight: strengthAccordionOpen ? "6000px" : "0",
            transitionProperty: "max-height",
            transitionDuration: strengthAccordionOpen ? "550ms" : "400ms",
            transitionTimingFunction: strengthAccordionOpen ? "cubic-bezier(0.32, 0.72, 0, 1)" : "cubic-bezier(0.4, 0, 0.2, 1)",
            transitionDelay: strengthAccordionOpen ? "0ms" : "220ms",
          }}
        >
          <div
            className={`overflow-hidden ${
              strengthAccordionOpen ? "opacity-100 overflow-visible" : "opacity-0"
            }`}
            style={{
              transitionProperty: "opacity",
              transitionDuration: strengthAccordionOpen ? "380ms" : "220ms",
              transitionTimingFunction: "ease-out",
              transitionDelay: strengthAccordionOpen ? "120ms" : "0ms",
            }}
          >
            <div id="strength-start-anchor" />
            <div ref={strengthWrapperRef} className="relative">
              <div
                ref={strengthSectionRef}
                className="relative w-screen h-screen bg-[#121316] overflow-hidden"
                style={{
                  willChange: "transform",
                  isolation: "isolate",
                }}
              >
                {/* タイトル（pin中のみ表示・ヘッダーと重ならないよう下げて表示） */}
                <div ref={strengthTitleRef} className="fixed top-20 md:top-24 inset-x-0 z-20 text-center px-2">
            <GlitchText
              text="Strength"
              variant="mono"
              className="text-[52px] sm:text-[68px] md:text-[96px] font-serif font-bold text-white
                         [text-shadow:_0_0_24px_rgba(255,255,255,0.4),_0_0_48px_rgba(255,255,255,0.2),_0_2px_4px_rgba(0,0,0,0.5)]"
              armed={isLoaded}
            />
            <p className="text-lg sm:text-xl md:text-2xl text-white/90 mt-2 font-medium
                       [text-shadow:_0_0_12px_rgba(255,255,255,0.25),_0_1px_2px_rgba(0,0,0,0.6)]">私の強み</p>
          </div>

          {/* 写真（背景） */}
          {photos.map((src, i) => {
            const slug = src.split("/").pop() ?? "";
            const noBorderContain = noBorderContainSlugs.some((s) => slug === s);
            return (
              <div
                key={i}
                ref={(el) => {
                  photoRefs.current[i] = el;
                }}
                className={`absolute overflow-hidden ${
                  noBorderContain
                    ? ""
                    : "rounded-xl border border-white/30 shadow-xl"
                }`}
                style={{
                  transform: "translate3d(0, 0, 0)",
                  opacity: 0,
                  willChange: "transform, opacity",
                  backfaceVisibility: "hidden",
                  perspective: "1000px",
                  zIndex: 2,
                }}
              >
                <div
                  className={`w-full flex items-center justify-center ${
                    noBorderContain ? "aspect-video" : "h-full"
                  }`}
                >
                  {noBorderContain ? (
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full max-h-full object-contain"
                      style={{ willChange: "transform" }}
                    />
                  ) : (
                    <div
                      className="w-full aspect-video bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${src})`,
                        willChange: "transform",
                      }}
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
                strengthRefs.current[i] = el;
              }}
              className="fixed inset-0 flex items-center justify-center z-30"
              style={{
                opacity: activeStrengthIndex === i ? 1 : 0,
                willChange: "opacity",
              }}
            >
              <article className="max-w-3xl px-4 sm:px-6 md:max-w-4xl md:px-8">
                <div className="flex gap-4 sm:gap-6 md:gap-8">
                  <span className="neon-cyan text-6xl sm:text-7xl md:text-8xl font-extrabold shrink-0 tracking-widest
                                 [filter:drop-shadow(0_0_12px_rgba(44,205,185,0.6))]">
                    {s.num}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#c4a8ff]
                       [text-shadow:_0_0_14px_rgba(109,50,194,.6),_0_0_28px_rgba(109,50,194,.4),_0_0_48px_rgba(109,50,194,.25),_0_2px_4px_rgba(0,0,0,0.5)]">
                      {s.title}
                    </h4>
                    <p className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl text-white leading-8 sm:leading-9 md:leading-10 font-semibold
                       [text-shadow:_0_0_8px_rgba(255,255,255,0.15),_0_2px_4px_rgba(0,0,0,0.9)]">
                      {s.text}
                    </p>
                  </div>
                </div>
              </article>
            </div>
          ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===============================
          Skill / Hobby（Strengthより前面に表示・背景でパララックスが透けないようにする）
          この要素がビューポートに入ったらパララックス強制終了
         =============================== */}
      <div ref={skillHobbyWrapperRef} className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 lg:px-14 bg-[#121316] pb-10 md:pb-14">
        <div className="mt-12 md:mt-20">
          <SkillBarsAbout />
        </div>

        <div className="mt-8 md:mt-12">
          <HobbySection
            items={[
              {
                src: "/hobby/figaro.jpg",
                alt: "Figaro",
                label: "フィガロ",
                description: "チワワとペキニーズのミックス犬。毎日の癒しです。",
                category: "DOG",
              },
              {
                src: "/hobby/camera.jpg",
                alt: "Photography",
                label: "写真",
                description: "最近はデジカメにハマってます。",
                category: "PHOTOGRAPHY",
                meta: ["Canon EOS R6", "2024"],
              },
              {
                src: "/hobby/movie1.jpg",
                alt: "Cinema",
                label: "映画",
                description: "休日は映画館で映画をよく観ています。",
                category: "CINEMA",
              },
              {
                src: "/hobby/snow.jpg",
                alt: "Snow Trip",
                label: "スノーボード",
                description: "唯一の体を動かす趣味です。",
                category: "SNOWBOARD",
              },
              {
                src: "/hobby/car.jpg",
                alt: "Car",
                label: "CIVIC",
                description: "夜のドライブ。",
                category: "CAR",
              },
              {
                src: "/hobby/NewYork.jpg",
                alt: "NewYork",
                label: "ニューヨーク",
                description: "いろんな国に旅行に行くのが夢です。",
                category: "TRAVEL",
                meta: ["New York, USA", "2023"],
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
