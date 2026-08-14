/**
 * CharReveal
 *
 * 文字を 1 つずつ、回転しながら下からスライドインさせる。
 * ScrollTrigger で画面に入ったときに 1 度だけ走る。
 *
 * `ui/GlitchText` とは同じ要素に併用できない（あちらは ::before / ::after に
 * data-text の複製を出す作りで、文字を分割すると 1 文字ずつ複製されてしまう）。
 * どちらの見せ方にするかは呼び出し側で選ぶ。
 *
 * 分割は SplitText プラグインを使わず JSX 側で行っている。サーバー側の HTML に
 * そのまま文字が出るので、JS が動かなくても本文が読める。
 */
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const DURATION = 0.7;
/** 1 文字ごとの遅延 */
const STAGGER = 0.045;
/** 開始位置。文字自身の高さに対する % なので、フォントサイズが変わっても崩れない */
const FROM_Y_PERCENT = 120;
const FROM_ROTATION = -28;

type Props = {
  text: string;
  className?: string;
  /** 出力するタグ。見出しに使うときは h1 / h2 を渡す */
  as?: "span" | "div" | "h1" | "h2" | "p";
  /** 画面に入ってから動き出すまでの待ち（秒） */
  delay?: number;
};

export default function CharReveal({ text, className = "", as: Tag = "span", delay = 0 }: Props) {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const chars = Array.from(root.querySelectorAll<HTMLElement>("[data-char]"));
    if (chars.length === 0) return;

    const mm = gsap.matchMedia();

    // 動きを減らす設定ではトゥイーンを作らない。
    // 素の状態が「見えている」なので、何もしなければそのまま表示される
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        chars,
        {
          yPercent: FROM_Y_PERCENT,
          rotation: FROM_ROTATION,
          autoAlpha: 0,
        },
        {
          yPercent: 0,
          rotation: 0,
          autoAlpha: 1,
          duration: DURATION,
          delay,
          stagger: STAGGER,
          // 少し行き過ぎてから収まる。文字が「落ちて決まる」感じになる
          ease: "back.out(1.4)",
          scrollTrigger: {
            trigger: root,
            start: "top 85%",
            once: true,
          },
        }
      );
    });

    return () => mm.revert();
  }, [text, delay]);

  return (
    <Tag ref={rootRef as React.Ref<never>} className={className}>
      {/* 読み上げ用。1 文字ずつに分割したものを読ませると
          「アール、アイ、ケー…」になってしまうので、
          分割前の文字列をここに置き、見えている側は aria-hidden にする */}
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {Array.from(text).map((ch, i) => (
          <span
            key={`${ch}-${i}`}
            data-char
            style={{
              display: "inline-block",
              // 回転の軸を文字の足元に置くと、倒れていたものが起き上がる動きになる
              transformOrigin: "50% 100%",
              // 半角スペースは inline-block だと潰れるので保持する
              whiteSpace: "pre",
            }}
          >
            {ch}
          </span>
        ))}
      </span>
    </Tag>
  );
}
