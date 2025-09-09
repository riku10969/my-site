// app/project/[slug]/page.tsx （例）

// クリックされた slug (about/works/contact) を先頭にして
// About / Works / Contact の3セクションを縦に並べて表示するページ
import { orderBySlugFirst, CANONICAL } from "../../../lib/projects";
import type { SectionSlug } from "../../../lib/projects";  // ← type-only に変更！
import styles from "../../styles/DetailPage.module.css";
import AboutSection from "../../components/sections/AboutSection";
import WorksSection from "../../components/sections/WorksSection";
import ContactSection from "../../components/sections/ContactSection";
import type { Metadata } from "next";

// generateMetadata は params を「オブジェクト」で受ける
export async function generateMetadata(
  { params }: { params: { slug: SectionSlug } }
): Promise<Metadata> {
  const Title = params.slug.charAt(0).toUpperCase() + params.slug.slice(1);
  return { title: `${Title} – Portfolio` };
}

// SSG 対象の slug 一覧
export function generateStaticParams(): Array<{ slug: SectionSlug }> {
  // CANONICAL が SectionSlug[] で型付けされていない場合に備えて as で合わせる
  return CANONICAL.map((slug) => ({ slug })) as Array<{ slug: SectionSlug }>;
}

// 必須ではないが、静的パスのみ許可したいなら false に
// export const dynamicParams = false;

const SECTION_MAP: Record<SectionSlug, React.ComponentType> = {
  about: AboutSection,
  works: WorksSection,
  contact: ContactSection,
};

export default function ProjectDetailPage(
  { params }: { params: { slug: SectionSlug } }
) {
  const order = orderBySlugFirst(params.slug);

  return (
    <main className={styles.page}>
      {/* ページ上部に現在の並びを小さく表示（任意） */}
      <nav className={styles.breadcrumbs} aria-label="Sections order">
        {order.map((s, i) => (
          <span key={s} className={styles.crumb}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {i < order.length - 1 ? " · " : ""}
          </span>
        ))}
      </nav>

      {/* セクション本体（縦積み） */}
      {order.map((slug) => {
        const Comp = SECTION_MAP[slug];
        return (
          <section id={slug} key={slug} className={styles.section}>
            <Comp />
          </section>
        );
      })}
    </main>
  );
}
