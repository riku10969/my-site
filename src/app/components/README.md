# components ディレクトリ構成

アニメーション技術が主役のものは技術名のディレクトリに、
それ以外は役割（ページ構成単位 / 汎用パーツ）で分けている。

```
components/
├── webgl/     Three.js（WebGL）
├── gsap/      GSAP
├── sections/  ページ構成単位のセクション
└── ui/        汎用パーツ・レイアウト
```

## webgl/ — Three.js

`three` を直接使い、`<canvas>` に描画するもの。全て `"use client"`。

| ファイル | 役割 |
|---|---|
| `WebGLScene.ts` | Top ページのシーン本体（React 非依存の純関数として切り出し） |
| `BackgroundStage.tsx` | トップ全体の背景。`shaders/` のノイズシェーダーを平面に適用 |
| `SkillScene3D.tsx` | Skills ページの 3D シーン |
| `NeonParticleStars.tsx` | Contact セクションのパーティクル |
| `DistortOverlay.tsx` | Projects イントロの歪みオーバーレイ |
| `shaders/` | GLSL を文字列でエクスポート（vertex / fragment） |

## gsap/ — GSAP

`gsap` のタイムラインでページ遷移演出を組むもの。
両方とも `ui/PageTransition.tsx` から呼ばれ、直接 import することはない。

| ファイル | 役割 |
|---|---|
| `TileTransition.tsx` | タイル分割のページ遷移 |
| `NeonPanelTransition.tsx` | ネオンパネルのページ遷移 |

## sections/ — ページ構成単位

各ルートが組み合わせて1ページを作る単位。使用技術は混在する。

| ファイル | 使用技術 |
|---|---|
| `TopSection.tsx` | `webgl/WebGLScene` を呼ぶ |
| `ProjectsIntoro.tsx` | GSAP + Swiper + `webgl/DistortOverlay` |
| `AboutSection.tsx` | 自前 rAF + IntersectionObserver（パララックス） |
| `HobbySection.tsx` | 自前 rAF |
| `SkillBarsAbout.tsx` | 自前 rAF + IntersectionObserver |
| `ContactSection.tsx` | IntersectionObserver + `webgl/NeonParticleStars` |
| `WorksSection.tsx` | CSS のみ |

`HobbySection` / `SkillBarsAbout` は `AboutSection` の内部パーツ。

## ui/ — 汎用パーツ

ライブラリに依存せず、CSS・自前 rAF・IntersectionObserver だけで動くもの。

| ファイル | 役割 |
|---|---|
| `header.tsx` / `Footer.tsx` | 共通レイアウト |
| `PageTransition.tsx` | 遷移演出の Context。実装は `gsap/` に委譲 |
| `Loader.tsx` | タイプ演出付きローダー |
| `GlitchText.tsx` / `FadeInText.tsx` | テキスト演出 |
| `InfiniteMarquee.tsx` | 無限スクロール |
| `CurtainModal.tsx` | Works の詳細モーダル |

## 注意

- `public/` は原本の保管場所ではない（[scripts/optimize-images.mjs](../../../scripts/optimize-images.mjs) 参照）。
  画像を追加したら `npm run images` で確認し、`npm run images:apply` で WebP に変換する。
- `@/*` → `src/*` のパスエイリアスが tsconfig に設定済み（現状は未使用）。
