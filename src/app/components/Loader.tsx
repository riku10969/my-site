"use client";

import { useEffect, useRef, useState } from "react";

type LoaderProps = {
  onFinish: () => void;
  text?: string;
  charDelayMs?: number;
  minShowMs?: number;
};

export default function Loader({
  onFinish,
  text = "Riku Ohashi Portfolio",
  charDelayMs = 110,
  minShowMs = 800,
}: LoaderProps) {
  const [displayed, setDisplayed] = useState("");
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(id);

        // ★ 背景にロゴ出現イベントを送る
        window.dispatchEvent(new CustomEvent("bg:showLogo"));

        // 少し余韻を置いてUIを閉じる（背景は常駐）
        const t = setTimeout(() => onFinishRef.current(), minShowMs);
        return () => clearTimeout(t);
      }
    }, charDelayMs);
    return () => clearInterval(id);
  }, [text, charDelayMs, minShowMs]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,        // テキストUIは最前面
        background: "transparent", // 背景は透過：背面のWebGLが見える
        display: "grid",
        placeItems: "center",
        userSelect: "none",
      }}
    >
      <div
        style={{
          color: "#d1f7c4",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "clamp(24px, 4vw, 40px)",
          letterSpacing: "0.04em",
          display: "flex",
          alignItems: "center",
          gap: "0.25em",
          textShadow: "0 0 8px rgba(120,255,170,0.25)",
        }}
      >
        <span>{displayed}</span>
        <span style={{ width: "0.6ch", animation: "blink 1s step-end infinite" }}>|</span>
      </div>
      <style jsx>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}
