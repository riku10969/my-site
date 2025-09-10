// app/[slug]/page.tsx
import type { Metadata } from "next";
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

/** Next 14/15 両対応：値 or Promise のどちらでも受けられる */
type Awaitable<T> = T | Promise<T>;

/** /about, /works, /contact を事前生成 */
export async function generateStaticParams() {
  return ALL_SECTIONS.map((slug) => ({ slug }));
}

/** メタデータ（Next 14/15 両対応） */
export async function generateMetadata(
  { params }: { params: Awaitable<{ slug: SectionSlug }> }
): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const title = slug.charAt(0).toUpperCase() + slug.slice(1);
  const canonical = `${SITE_URL}/${slug}`;

  return {
    title,
    alternates: { canonical },
    openGraph: { title, url: canonical, type: "website" },
    twitter: { card: "summary_large_image", title },
  };
}

/** ページ本体（Next 14/15 両対応） */
export default async function Page(
  { params }: { params: Awaitable<{ slug: SectionSlug }> }
) {
  const { slug } = await Promise.resolve(params);
  const ordered = orderBySlugFirst(slug);

  const SectionMap: Record<SectionSlug, () => JSX.Element> = {
    about: AboutSection,
    works: WorksSection,
    contact: ContactSection,
  };

  return (
    <main className={styles.container}>
      {ordered.map((s) => {
        const Section = SectionMap[s];
        return (
          <section key={s} id={s} className={styles.section}>
            <Section />
          </section>
        );
      })}
    </main>
  );
}
