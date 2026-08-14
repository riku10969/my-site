"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";

/** page.tsx の h1。タイプ演出の文字はここへ縮んでいく */
const TITLE_ID = "site-title";

type LoaderProps = {
  onFinish: () => void;
  text?: string;
  charDelayMs?: number;
  /** タイプ完了後、h1 へ縮むまでの時間。ここが終わったら onFinish */
  minShowMs?: number;
};

export default function Loader({
  onFinish,
  text = "Riku Ohashi Portfolio",
  charDelayMs = 110,
  minShowMs = 800,
}: LoaderProps) {
  const [displayed, setDisplayed] = useState("");
  const [typingDone, setTypingDone] = useState(false);
  const textRef = useRef<HTMLDivElement | null>(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // 同じ文字が中央と上部で二重に見えるので、ローダーが出ている間は h1 を隠す。
  // 描画前に消したいので useLayoutEffect
  useLayoutEffect(() => {
    const title = document.getElementById(TITLE_ID);
    if (!title) return;
    gsap.set(title, { autoAlpha: 0 });
    // 演出が途中で止まっても h1 が消えたままにならないようにする
    return () => {
      gsap.set(title, { autoAlpha: 1 });
    };
  }, []);

  // 1文字ずつ出す
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(id);
        setTypingDone(true);
      }
    }, charDelayMs);
    return () => clearInterval(id);
  }, [text, charDelayMs]);

  /**
   * タイプ完了後の演出。背景のハートを出すのと「同時」に文字を h1 へ縮める。
   * 直列にすると待ち時間が伸びるので、どちらも minShowMs の枠内で終わらせる。
   *
   * カーソルを消してからでないと幅がずれるため、typingDone で 1 度描き直した
   * あとに測っている（useLayoutEffect は commit 後に走る）。
   */
  useLayoutEffect(() => {
    if (!typingDone) return;

    // 背景のハートの出現をここで開始させる
    window.dispatchEvent(new CustomEvent("bg:showLogo"));

    const el = textRef.current;
    const title = document.getElementById(TITLE_ID);
    const duration = minShowMs / 1000;

    const finish = () => {
      if (title) gsap.set(title, { autoAlpha: 1 });
      onFinishRef.current();
    };

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!el || !title || reduced) {
      // 動きを減らす設定、または h1 が無いページでは縮めずに終わる
      const t = window.setTimeout(finish, minShowMs);
      return () => window.clearTimeout(t);
    }

    const from = el.getBoundingClientRect();
    const to = title.getBoundingClientRect();

    // 文字は縦横別々に伸縮させると字形が崩れるので、高さ基準の等倍で寄せる。
    // 書体とレタースペースの違いで幅は完全には一致しないが、
    // 着地際のクロスフェードで吸収される
    const scale = to.height / from.height;

    const tl = gsap.timeline({ onComplete: finish });
    tl.to(
      el,
      {
        x: to.left + to.width / 2 - (from.left + from.width / 2),
        y: to.top + to.height / 2 - (from.top + from.height / 2),
        scale,
        duration,
        ease: "power3.inOut",
      },
      0
    )
      // 着地の少し手前で本物の h1 と入れ替える
      .to(el, { autoAlpha: 0, duration: duration * 0.3 }, duration * 0.7)
      .to(title, { autoAlpha: 1, duration: duration * 0.3 }, duration * 0.7);

    return () => {
      tl.kill();
    };
  }, [typingDone, minShowMs]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999, // テキストUIは最前面
        background: "transparent", // 背景は透過：背面のWebGLが見える
        display: "grid",
        placeItems: "center",
        userSelect: "none",
      }}
      aria-hidden
    >
      <div
        ref={textRef}
        style={{
          color: "#d1f7c4",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "clamp(24px, 4vw, 40px)",
          letterSpacing: "0.04em",
          display: "flex",
          alignItems: "center",
          gap: "0.25em",
          textShadow: "0 0 8px rgba(120,255,170,0.25)",
          whiteSpace: "nowrap",
        }}
      >
        <span>{displayed}</span>
        {/* 縮み始める前に消す。残すと幅が変わって着地位置がずれる */}
        {!typingDone && (
          <span style={{ width: "0.6ch", animation: "blink 1s step-end infinite" }}>|</span>
        )}
      </div>
      <style jsx>{`
        @keyframes blink {
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
