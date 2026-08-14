"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

// 変更点: Propsに armed を追加
type Props = {
  text: string;
  as?: React.ElementType;
  className?: string;
  delaySec?: number;
  replayOnHover?: boolean;
  variant?: "screen" | "mono";
  trigger?: "mount" | "scroll" | "scroll-once" | "manual";
  threshold?: number;
  rootMargin?: string;
  armed?: boolean; // ← 追加：外部からの手動アーム
};

export default function GlitchText({
  text,
  as = "span",
  className = "",
  delaySec = 0,
  replayOnHover = false,
  variant = "screen",
  trigger = "mount",
  threshold = 0.3,
  rootMargin = "0px",
  armed = false, // ← 追加
}: Props) {
  const [on, setOn] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // as で渡されたタグに ref と data-text を通すため、受け付ける props を明示する。
  // 素の React.ElementType だと props が解決できず ref の代入が型エラーになる
  const Tag = (as || "span") as React.ElementType<
    React.HTMLAttributes<HTMLElement> & {
      ref?: React.Ref<HTMLElement>;
      "data-text"?: string;
    }
  >;
  const extra = variant === "mono" ? "glitch--mono" : "glitch--screen";

  // 共通の再生関数。delaySec が変わらない限り同一性を保つので、
  // 下の useEffect の依存に入れても再実行が増えない
  const play = useCallback(
    (withDelay = delaySec) => {
      const run = () => {
        setOn(false);
        requestAnimationFrame(() => setOn(true));
      };
      if (withDelay) {
        timer.current = setTimeout(run, withDelay * 1000);
      } else {
        run();
      }
    },
    [delaySec]
  );

  // mount / scroll / scroll-once / manual
  useEffect(() => {
    if (trigger === "mount") {
      play();
      return () => { if (timer.current) clearTimeout(timer.current); };
    }

    if (trigger === "manual") {
      // 外部から on を操作する前提。ここでは何もしない。
      return;
    }

    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        play();
        if (trigger === "scroll-once") io.unobserve(el);
      } else if (trigger === "scroll") {
        setOn(false);
      }
    }, { threshold, rootMargin });

    io.observe(el);
    return () => {
      io.disconnect();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [trigger, threshold, rootMargin, play]);

  // 🔑 追加：armed が true になった瞬間、要素が画面内なら即再生
  useEffect(() => {
    if (!armed) return;
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const inView =
      r.top < window.innerHeight &&
      r.bottom > 0 &&
      r.left < window.innerWidth &&
      r.right > 0;

    if (inView) {
      // delaySec は尊重して良いが、即走らせたいなら 0 にする
      play(delaySec);
    }
  }, [armed, delaySec, play]); // armed の立ち上がりで発火

  // ホバー時に毎回 Glitch を再生（off → on を短い間隔で行いアニメをリスタート）
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleReplayHover = () => {
    if (!replayOnHover) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setOn(false);
    hoverTimerRef.current = setTimeout(() => {
      setOn(true);
      hoverTimerRef.current = null;
    }, 50);
  };

  return (
    <Tag
      ref={ref}
      data-text={text}
      className={`glitch ${extra} ${on ? "on" : ""} ${className}`}
      onMouseEnter={replayOnHover ? handleReplayHover : undefined}
    >
      {text}
    </Tag>
  );
}
