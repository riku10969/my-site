// src/lib/projects.ts

export const CANONICAL = ['about', 'works', 'contact'] as const;
export type SectionSlug = typeof CANONICAL[number];

export type Project = {
  title: string;
  image: string;
  slug: SectionSlug;
  path: `/project/${SectionSlug}`;
};

export const projects: Project[] = [
  { title: "About",   image: "/projects/project1.jpg", slug: "about",   path: "/project/about" },
  { title: "Works",   image: "/projects/project2.jpg", slug: "works",   path: "/project/works" },
  { title: "Contact", image: "/projects/project3.jpg", slug: "contact", path: "/project/contact" },
];

// ★ セクション縦並び用（先頭だけ入れ替える）
export function orderBySlugFirst(clicked: SectionSlug): SectionSlug[] {
  return [clicked, ...CANONICAL.filter((s) => s !== clicked)];
}

// ★ カードなど画像付きUI用（Project配列を並べ替え）
export function reorderBySlug(clicked: SectionSlug): Project[] {
  const head = projects.find((p) => p.slug === clicked);
  if (!head) return projects;
  const rest = projects
    .filter((p) => p.slug !== clicked)
    .sort((a, b) => CANONICAL.indexOf(a.slug) - CANONICAL.indexOf(b.slug));
  return [head, ...rest];
}


