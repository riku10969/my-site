// app/[slug]/page.tsx
import type { Metadata, PageProps } from "next";

// ▼ あなたの実装に合わせて相対パスを調整してください
import AboutSection from "../../components/sections/AboutSection";
import WorksSection from "../../components/sections/WorksSection";
import ContactSection from "../../components/sections/ContactSection";
import styles from "../../styles/DetailPage.module.css";

/** 取りうるセクションの slug 型 */
type SectionSlug = "about" | "works" | "contact";

/** 並び順の基準（slug を先頭にして他を続ける） */
const ALL_SECTIONS: SectionSlug[] = ["about", "works", "contact"];
const orderBySlugFirst = (first: SectionSlug): SectionSlug[] => [
  first,
  ...ALL_SECTIONS.filter((s) => s !== first),
];

/** サイトのベース URL（env にある場合はそちらを優先） */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "https://example.com";

/** SSG 用（/about, /works, /contact を事前生成） */
export async function generateStaticParams() {
  return ALL_SECTIONS.map((slug) => ({ slug }));
}

/** メタデータ（Next 15: PageProps を使用し、params を await する） */
export async function generateMetadata(
  { params }: PageProps<{ slug: SectionSlug }>
): Promise<Metadata> {
  const { slug } = await params;
  const title = slug.charAt(0).toUpperCase() + slug.slice(1);
  const canonical = `${SITE_URL}/${slug}`;

  return {
    title,
    alternates: { canonical },
    openGraph: {
      title,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
    },
  };
}

/** ページ本体（Next 15: PageProps を使用し、params を await する） */
export default async function Page(
  { params }: PageProps<{ slug: SectionSlug }>
) {
  const { slug } = await params;

  const ordered = orderBySlugFirst(slug);

  // セクションのマップ（必要に応じて props を渡す形にしてもOK）
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
