"use client";
import React, { useEffect, useRef, useState } from "react";

type Props = {
  text: string;
  from?: "left" | "right";
  /** 1文字ごとの遅延（秒） */
  stagger?: number;
  /** 出現開始までのベース遅延（秒） */
  baseDelay?: number;
  className?: string;
};

export default function FadeInText({
  text,
  from = "left",
  stagger = 0.06,
  baseDelay = 0,
  className = "",
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current!;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const dir = from === "left" ? "-24px" : "24px";

  return (
    <span ref={ref} className={`inline-block ${className}`} aria-label={text}>
      {text.split("").map((ch, i) => (
        <span
          key={i}
          className={`inline-block reveal ${visible ? "in" : ""}`}
          style={{
            // CSS 変数で方向を渡す
            // @see globals.css
            ["--reveal-x" as any]: dir,
            transitionDelay: `${baseDelay + i * stagger}s`,
          }}
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}
