// クリックされた slug (about/works/contact) を先頭にして
// About / Works / Contact の3セクションを縦に並べて表示するページ
import { orderBySlugFirst, CANONICAL, SectionSlug } from "../../../lib/projects";
import styles from "../../styles/DetailPage.module.css";
import AboutSection from "../../components/sections/AboutSection";
import WorksSection from "../../components/sections/WorksSection";
import ContactSection from "../../components/sections/ContactSection";
import type { Metadata } from "next";

export function generateMetadata({ params }: { params: { slug: "about"|"works"|"contact" } }): Metadata {
  const Title = params.slug.charAt(0).toUpperCase() + params.slug.slice(1);
  return { title: `${Title} – Portfolio` };
}

export function generateStaticParams() {
  // /project/about, /project/works, /project/contact を事前生成
  return CANONICAL.map((slug) => ({ slug }));
}

const SECTION_MAP: Record<SectionSlug, React.ComponentType> = {
  about: AboutSection,
  works: WorksSection,
  contact: ContactSection,
};

export default function ProjectDetailPage({
  params,
}: {
  params: { slug: SectionSlug };
}) {
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
