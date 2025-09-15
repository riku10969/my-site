"use client";

import { useEffect, useRef, useState } from "react";
import { FaInstagram } from "react-icons/fa";
import { SiGmail } from "react-icons/si";

export default function ContactSection() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [triggered, setTriggered] = useState(false);
  const [litIndex, setLitIndex] = useState(-1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e.isIntersecting && !triggered) {
          setTriggered(true);
          [0, 1, 2].forEach((i) => {
            setTimeout(() => setLitIndex(i), i * 400);
          });
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [triggered]);

  return (
    <section
      ref={ref}
      className="min-h-[60vh] flex items-center justify-center px-6 py-24 bg-black"
      aria-labelledby="contact-heading"
    >
      <div className="w-full max-w-4xl text-center space-y-10">
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

      <style jsx>{`
        :global(.neon-cyan) {
          --c-main: #2ccdb9;
          color: var(--c-main);
          text-shadow: 0 0 6px var(--c-main), 0 0 14px var(--c-main),
            0 0 28px rgba(44, 205, 185, 0.8), 0 0 56px rgba(44, 205, 185, 0.6);
        }
        :global(.neon-purple) {
          --c-main: #8a5cff;
          color: var(--c-main);
          text-shadow: 0 0 6px var(--c-main), 0 0 14px var(--c-main),
            0 0 28px rgba(138, 92, 255, 0.8), 0 0 56px rgba(138, 92, 255, 0.6);
        }
        :global(.neon-amber) {
          --c-main: #ffb34d;
          color: var(--c-main);
          text-shadow: 0 0 6px var(--c-main), 0 0 14px var(--c-main),
            0 0 28px rgba(255, 179, 77, 0.85), 0 0 56px rgba(255, 179, 77, 0.6);
        }
        :global(.flicker) {
          animation: flicker 2.8s ease-in-out infinite;
        }
        @keyframes flicker {
          0% { opacity: 1; }
          8% { opacity: 0.85; }
          10% { opacity: 1; }
          22% { opacity: 0.92; }
          30% { opacity: 1; }
          45% { opacity: 0.88; }
          55% { opacity: 1; }
          70% { opacity: 0.93; }
          100% { opacity: 1; }
        }
      `}</style>
    </section>
  );
}
