"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";

const imagesGraphic = [
  "/works/graphic1.png",
  "/works/graphic2.png",
  "/works/graphic3.png",
];

const imagesWeb = [
  "/works/web1.png",
  "/works/web2.png",
  "/works/web3.png",
];

function InfiniteScroll({ images, direction = "right" }: { images: string[], direction?: "left" | "right" }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const totalWidth = el.scrollWidth / 2; // 画像リストを2回並べるので半分でループ
    gsap.to(el, {
      x: direction === "right" ? -totalWidth : totalWidth,
      duration: 20,
      ease: "linear",
      repeat: -1,
    });
  }, [direction]);

  return (
    <div className="overflow-hidden w-full relative">
      <div ref={containerRef} className="flex">
        {[...images, ...images].map((src, i) => (
          <div key={i} className="min-w-[200px] mx-2">
            <Image src={src} alt="" width={200} height={200} className="rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Works() {
  return (
    <section className="bg-[#333] text-white py-16">
      <h2 className="text-center text-2xl mb-8">Works</h2>

      <div className="mb-8">
        <h3 className="text-teal-400 mb-4">Graphic</h3>
        <InfiniteScroll images={imagesGraphic} direction="right" />
      </div>

      <div>
        <h3 className="text-purple-400 mb-4">Web</h3>
        <InfiniteScroll images={imagesWeb} direction="left" />
      </div>
    </section>
  );
}
