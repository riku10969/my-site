/**
 * /skills
 *
 * 重ね積みのページ。全画面のレイヤーが張り付いたまま、次のレイヤーが下から
 * 乗り上げて前のレイヤーを覆う。ここが持つのはデータと並べる順序だけで、
 *
 *   器（張り付き・重なりの量） … ui/StackSection + styles/SkillStack.module.css（CSS のみ）
 *   レイヤーごとの動き         … gsap/SkillLayerTimeline（レイヤー 1 枚 = timeline 1 本）
 *   マークアップ               … sections/SkillHero, sections/SkillLayer
 *
 * に分けている。
 *
 * ---------------------------------------------------------------------------
 * 写真について
 *
 * 04〜06 は専用の写真が無いので既存のものを使い回している。差し替えるときは
 * `public/` に置いて `npm run images` → `npm run images:apply` を通すこと
 * （scripts/optimize-images.mjs 参照）。
 *
 *   04 BackEnd     parallax/coding（コード）, parallax/site（動いているサイト）
 *   05 FrontCreate skill/frontend2, works/web4, skill/frontend1（いずれもサイトの画面）
 *   06 subSkill    RikuLogo3（押し出した 3D ロゴ）, skill/subskill1（Excel / VBA）,
 *                  skill/subskill2（Git）
 *
 * 03 と 05 は同じ画面を使い回している（隣り合っていないので並べて見えることはない）。
 * `parallax/07` `parallax/emo` `parallax/noise` は人物写真なのでスキルには使わない。
 *
 * variant は隣り合うセクションで重複しない順に並べてある
 * （flip → loop → depth → split → loop → depth）。
 */
"use client";

import Footer from "../components/ui/Footer";
import SkillHero from "../components/sections/SkillHero";
import SkillLayer, { type Skill } from "../components/sections/SkillLayer";

const SKILLS: Skill[] = [
  {
    id: "branding",
    num: "01",
    title: "Branding",
    tagJa: "ブランディング",
    body:
      "ヒアリングからコンセプト設計、配色・タイポ・ビジュアルデザインまで、Web・ロゴ制作をトータルに対応。企画書やモックアップで具体的な提案が可能です。",
    imgs: ["/skill/branding1.webp", "/skill/branding2.webp", "/skill/branding3.webp"],
    variant: "flip",
    accent: "#2ccdb9",
    points: [
      "ヒアリングから言葉にしてコンセプトへ落とす",
      "配色・タイポを決めてトーンを揃える",
      "企画書とモックアップで着地点を見せる",
    ],
    tools: ["Illustrator", "Figma", "Photoshop"],
  },
  {
    id: "design",
    num: "02",
    title: "Design",
    tagJa: "デザイン",
    body:
      "Illustrator・Photoshop・Figmaなどのデザインツールを活用し、ロゴやポスター制作、写真加工、Web UIデザインまで幅広く対応可能です。",
    imgs: ["/skill/design1.webp", "/skill/design2.webp", "/skill/design3.webp"],
    variant: "loop",
    accent: "#8a5cff",
    points: [
      "ロゴ・ポスターなどグラフィック全般",
      "写真の加工とレタッチ",
      "Web UI をコンポーネント単位で設計",
    ],
    tools: ["Figma", "Illustrator", "Photoshop", "Lightroom"],
  },
  {
    id: "frontend",
    num: "03",
    title: "FrontEnd",
    tagJa: "フロントエンド開発",
    body:
      "Next.js（App Router）と TypeScript で、Figma のデザインをコンポーネントに落とし込みます。レスポンシブ、キーボード操作、動きを減らす設定への対応まで含めて実装します。",
    imgs: ["/skill/frontend1.webp", "/skill/frontend2.webp"],
    variant: "depth",
    accent: "#38bdf8",
    points: [
      "Figma のデザインを React コンポーネントへ忠実に再現",
      "App Router とサーバー / クライアントの切り分け",
      "Tailwind でトークンを揃えて組む",
    ],
    tools: ["Next.js", "TypeScript", "React", "Tailwind"],
  },
  {
    // TODO: 実績に合わせて書き換える。ここは他のセクションと違って
    // このリポジトリに裏付けとなるコードが無い（API ルートも DB も無い）
    id: "backend",
    num: "04",
    title: "BackEnd",
    tagJa: "バックエンド開発",
    body:
      "フォームの受け口やデータの受け渡しなど、画面の裏側の処理。Next.js の Route Handler を起点に、外部 API との連携や環境変数の扱いを含めて組み立てます。",
    imgs: ["/parallax/coding.webp", "/parallax/site.webp"],
    variant: "split",
    accent: "#4ade80",
    points: [
      "Route Handler で API の受け口を作る",
      "外部 API との連携とエラー時の分岐",
      "環境変数と秘密情報を扱いごとに分ける",
    ],
    tools: ["Node.js", "Route Handler", "REST"],
  },
  {
    id: "frontcreate",
    num: "05",
    title: "FrontCreate",
    tagJa: "スクロール演出・ページ遷移（GSAP）",
    body:
      "GSAP の ScrollTrigger と timeline で、スクロールに紐づいた演出とページ遷移を組みます。動きの持ち主を 1 本の timeline に寄せ、後片付けまで含めて設計します。",
    imgs: ["/skill/frontend2.webp", "/works/web4.webp", "/skill/frontend1.webp"],
    variant: "loop",
    accent: "#ffb34d",
    points: [
      "pin / scrub でスクロール量に紐づける",
      "ページ遷移の幕（格子・ルーバー・グリッチ）を差し替え可能に作る",
      "動きを減らす設定に必ず対応する",
    ],
    tools: ["GSAP", "ScrollTrigger", "Flip", "Observer"],
  },
  {
    id: "subskill",
    num: "06",
    title: "SubSkill",
    tagJa: "WebGL・補助スキル（Three.js）",
    body:
      "Three.js で WebGL の背景や 3D のロゴを作ります。SVG を押し出して立体にしたり、GLSL のノイズシェーダーを平面に敷いたり。あわせて VBA での業務効率化や Git でのバージョン管理にも対応できます。",
    imgs: ["/RikuLogo3.webp", "/skill/subskill1.webp", "/skill/subskill2.webp"],
    variant: "depth",
    accent: "#f472b6",
    points: [
      "SVG を押し出して 3D のロゴにする",
      "GLSL のノイズシェーダーを書いて背景に敷く",
      "VBA での自動化と Git でのバージョン管理",
    ],
    tools: ["Three.js", "GLSL", "Git", "VBA"],
  },
];

export default function SkillsPage() {
  return (
    <main className="relative w-full font-sans text-white">
      <SkillHero skills={SKILLS} />

      {SKILLS.map((skill, i) => (
        <SkillLayer
          key={skill.id}
          skill={skill}
          index={i}
          total={SKILLS.length}
          isLast={i === SKILLS.length - 1}
        />
      ))}

      <Footer />
    </main>
  );
}
