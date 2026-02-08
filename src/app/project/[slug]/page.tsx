// src/app/project/[slug]/page.tsx
import type { Metadata } from "next";
import type { ComponentType } from "react";
import Footer from "../../components/Footer";

import AboutSection from "../../components/sections/AboutSection";
import WorksSection from "../../components/sections/WorksSection";
import ContactSection from "../../components/sections/ContactSection";
import styles from "../../styles/DetailPage.module.css";
type SectionSlug = "about" | "works" | "contact";
const ALL_SECTIONS: SectionSlug[] = ["about", "works", "contact"];
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

/** Next 15 仕様：params は Promise で受ける */
export async function generateMetadata(
  { params }: { params: Promise<{ slug: SectionSlug }> }
): Promise<Metadata> {
  const { slug } = await params;
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
  { params }: { params: Promise<{ slug: SectionSlug }> }
) {
  const { slug } = await params;
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
