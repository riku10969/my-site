"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FaInstagram } from "react-icons/fa";
import { SiGmail } from "react-icons/si";
import NeonParticleStars from "../webgl/NeonParticleStars";

gsap.registerPlugin(ScrollTrigger);

/** 点灯の開始待ちと1段ごとの間隔（秒） */
const LIT_INITIAL_DELAY = 0.45;
const LIT_STEP = 0.55;
const LIT_STEPS = 3;

export default function ContactSection() {
  const ref = useRef<HTMLDivElement | null>(null);
  // -1 = 全消灯。0,1,2 と進むごとに Contact Me → Instagram → Gmail が点く
  const [litIndex, setLitIndex] = useState(-1);

  // 表示されるたびに順番に点灯させる。タイマー配列を自前で持つ代わりに
  // 1本の timeline にまとめ、画面外に出たら 0 に巻き戻す
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true });
      for (let i = 0; i < LIT_STEPS; i++) {
        tl.call(() => setLitIndex(i), undefined, LIT_INITIAL_DELAY + i * LIT_STEP);
      }

      // ScrollTrigger は timeline の後に作る。vars に混ぜて書くと、生成時の
      // refresh で onLeave が呼ばれたときに tl がまだ未初期化になりうる
      const reset = () => {
        tl.pause(0);
        setLitIndex(-1);
      };
      ScrollTrigger.create({
        trigger: el,
        start: "top 70%",
        end: "bottom 30%",
        onEnter: () => tl.restart(),
        onEnterBack: () => tl.restart(),
        onLeave: reset,
        onLeaveBack: reset,
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={ref}
      className="relative min-h-[60vh] flex items-center justify-center px-6 py-24 bg-[#060612] overflow-hidden"
      aria-labelledby="contact-heading"
    >
      <NeonParticleStars />
      <div className="relative z-10 w-full max-w-4xl text-center space-y-10">
        <h2 id="contact-heading" className="sr-only">
          Contact
        </h2>

        {/* ① contact ME */}
        <div className="flex justify-center mb-34">
          <span
            className={[
              "text-5xl md:text-7xl font-extrabold tracking-wide select-none",
              litIndex >= 0 ? "scale-105 neon-cyan flicker" : "opacity-70",
            ].join(" ")}
          >
            Contact&nbsp;Me
          </span>
        </div>

        {/* ② Instagram */}
        <div className="flex justify-center">
          <a
            href="https://www.instagram.com/riku.1ok6"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-3xl md:text-4xl font-bold transition duration-500 hover:scale-[1.05]"
          >
            <FaInstagram
              className={[
                "transition duration-500",
                litIndex >= 1 ? "neon-purple flicker" : "text-gray-500 hover:text-purple-400",
              ].join(" ")}
              size={42}
            />
            <span
              className={[
                litIndex >= 1 ? "neon-purple flicker" : "text-gray-400 hover:text-purple-400",
              ].join(" ")}
            >
              riku.1ok6
            </span>
          </a>
        </div>

        {/* ③ Gmail */}
        <div className="flex justify-center">
          <a
            href="mailto:riku.1ok6@gmail.com"
            className="flex items-center gap-3 text-3xl md:text-4xl font-bold transition duration-500 hover:scale-[1.05]"
          >
            <SiGmail
              className={[
                "transition duration-500",
                litIndex >= 2 ? "neon-amber flicker" : "text-gray-500 hover:text-amber-400",
              ].join(" ")}
              size={42}
            />
            <span
              className={[
                litIndex >= 2 ? "neon-amber flicker" : "text-gray-400 hover:text-amber-400",
              ].join(" ")}
            >
              riku.1ok6@gmail.com
            </span>
          </a>
        </div>
          <div className="mt-20 text-center text-gray-400 text-lg tracking-wide">
            Feel free to reach out anytime.
          </div>
      </div>

    </section>
  );
}
