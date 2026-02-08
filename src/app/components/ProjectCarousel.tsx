"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePageTransition } from "./PageTransition";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import type { Project } from "../../lib/projects";

export default function ProjectCarousel({
  currentSlug,
  items,
}: {
  currentSlug: "about" | "works" | "contact";
  items: Project[];
}) {
  const [active, setActive] = useState(0);
  const router = useRouter();
  const { push } = usePageTransition();

  useEffect(() => {
    items.forEach((p) => {
      try {
        router.prefetch?.(`/project/${p.slug}`);
      } catch {}
    });
  }, [items, router]);

  const go = (slug: string) => {
    push(`/project/${slug}`);
  };

  return (
    <div style={{ minHeight: "100vh", padding: "80px 24px", background: "#0b0b0c", position: "relative" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ color: "white", fontSize: 28, fontWeight: 800, marginBottom: 16 }}>
          {items[0]?.title}
        </h1>

        <Swiper
          modules={[Navigation]}
          navigation
          loop={false}
          slidesPerView={1}
          spaceBetween={28}
          speed={600}
          initialSlide={0}
          onSlideChange={(s) => setActive(s.activeIndex)}
          style={{ paddingBottom: 16 }}
        >
          {items.map((p) => (
            <SwiperSlide key={p.slug}>
              <article
                // キーボード操作でも即時ローダー → 遷移
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    go(p.slug);
                  }
                }}
                // クリックより早い onMouseDown / onTouchStart でローダーを即表示
                onMouseDown={(e) => {
                  // Swiperのドラッグ操作はスキップ
                  if ((e as any).button !== 0) return;
                  go(p.slug);
                }}
                onTouchStart={() => go(p.slug)}
                onClick={(e) => {
                  // 既に onMouseDown で処理済みなので、クリックは無視（重複遷移防止）
                  e.preventDefault();
                }}
                role="button"
                tabIndex={0}
                style={{
                  borderRadius: 18,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <div
                  style={{
                    aspectRatio: "16/10",
                    background: `center/cover no-repeat url(${p.image})`,
                  }}
                  aria-label={p.title}
                  role="img"
                />
                <div style={{ padding: 14 }}>
                  <h2 style={{ color: "white", fontSize: 20, fontWeight: 700 }}>{p.title}</h2>
                </div>
              </article>
            </SwiperSlide>
          ))}
        </Swiper>

        <div style={{ marginTop: 10, color: "#bfc5d1" }}>{items[active]?.title}</div>
      </div>
    </div>
  );
}
