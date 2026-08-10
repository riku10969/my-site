// src/app/project/[slug]/page.tsx
import type { Metadata } from "next";
import type { ComponentType } from "react";
import { notFound } from "next/navigation";
import Footer from "../../components/Footer";

import AboutSection from "../../components/sections/AboutSection";
import WorksSection from "../../components/sections/WorksSection";
import ContactSection from "../../components/sections/ContactSection";
import styles from "../../styles/DetailPage.module.css";
type SectionSlug = "about" | "works" | "contact";
const ALL_SECTIONS: SectionSlug[] = ["about", "works", "contact"];

/** 未定義の slug（/project/foo など）を弾く。true のときだけ SectionMap を引ける */
const isSectionSlug = (value: string): value is SectionSlug =>
  (ALL_SECTIONS as string[]).includes(value);

const orderBySlugFirst = (first: SectionSlug): SectionSlug[] => [
  first,
  ...ALL_SECTIONS.filter((s) => s !== first),
];

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "https://example.com";

/** /project/about, /project/works, /project/contact を事前生成 */
export async function generateStaticParams() {
  return ALL_SECTIONS.map((slug) => ({ slug }));
}

/**
 * generateStaticParams に無い slug は 404 にする。
 * これを false にしないと、未知の slug が ISR で生成・キャッシュされ
 * 404画面がステータス 200（soft 404）で配信されてしまう。
 */
export const dynamicParams = false;

/** Next 15 仕様：params は Promise で受ける */
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;

  // 未定義の slug は 404 を返すので、canonical / OG は出さない
  if (!isSectionSlug(slug)) {
    return { title: "404 – Not Found", robots: { index: false, follow: false } };
  }

  const title = slug.charAt(0).toUpperCase() + slug.slice(1);
  const canonical = `${SITE_URL}/project/${slug}`;

  return {
    title,
    alternates: { canonical },
    openGraph: { title, url: canonical, type: "website" },
    twitter: { card: "summary_large_image", title },
  };
}

/** ページ本体（同じく Promise で受ける） */
export default async function Page(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // 未定義の slug は not-found.tsx（404）へ。これが無いと SectionMap[slug] が
  // undefined のままレンダリングされて 500 になる
  if (!isSectionSlug(slug)) notFound();

  const ordered = orderBySlugFirst(slug);

const SectionMap: Record<SectionSlug, ComponentType<any>> = {
    about: AboutSection,
    works: WorksSection,
    contact: ContactSection,
  };

  return (
    <main className={styles.container}>
        {ordered.map((s) => {
          const Section = SectionMap[s];
          return (
            <section
              key={s}
              id={s}
              className={styles.section}
              style={s !== "about" ? { position: "relative" as const, zIndex: 10 } : undefined}
            >
              <Section />
            </section>
          );
        })}
        <Footer/>
      </main>
  );
}
