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

`gsap` のタイムラインが主役のもの。

| ファイル | 役割 | 呼び出し元 |
|---|---|---|
| `TileTransition.tsx` | ページを覆う遷移の骨組み。色・遷移タイミング・LOADING（フック） | `ui/PageTransition.tsx` |
| `curtains/` | その「どう動くか」の差し替え可能な定義 | `TileTransition.tsx` |
| `NeonPanelTransition.tsx` | ネオンパネルのページ遷移（フック） | `ui/PageTransition.tsx` |
| `ProjectsIntroReel.tsx` | Projects イントロのカードリール + Swiper へのクロスフェード（フック） | `sections/ProjectsIntoro.tsx` |
| `CharReveal.tsx` | 文字を 1 つずつ回転させながらスライドイン（コンポーネント） | `sections/AboutSection.tsx` |
| `HeroBandParallax.tsx` | 全幅の帯に敷いた写真をゆっくり持ち上げる（フック） | `sections/AboutSection.tsx` |
| `MarqueeLoop.tsx` | 横方向の無限ループ + タッチドラッグ。ScrollTrigger で画面外は停止（フック） | `ui/InfiniteMarquee.tsx` |
| `WatermarkParallax.tsx` | フッター透かしの `--wm-y` / `--wm-o` を `scrub`（フック） | `ui/Footer.tsx` |
| `ZoomFlip.tsx` | タイル → 拡大表示のモーフィング。`Flip` プラグイン（フック） | `sections/HobbySection.tsx` |
| `StrengthParallax.tsx` | Strength の全画面パララックス。ScrollTrigger の `pin` + `scrub`。進入中は `SCROLL ↓↓↓` を出し、pin と同時に回転で `Strength` に入れ替える | `sections/AboutSection.tsx` |

マークアップが呼び出し側にあるものはフック、マークアップとタイムラインが不可分な
`StrengthParallax` と `CharReveal` はコンポーネントを export している。

### gsap/curtains/ — 覆う遷移の見せ方

`TileTransition` は格子状の div を並べるだけで、実際の動きは以下から選ぶ。
どれも同じ DOM を使い回すので、増やしても DOM は増えない。

| ファイル | 見せ方 | |
|---|---|---|
| `grid.ts` | 正方形タイルが右上から左下へ不規則に出現。剥がれるときは左下から | **採用中** |
| `louver.ts` | 縦のルーバーが右端から順に閉じ、左端から開く | 保留 |
| `glitch.ts` | 横帯が乱れながら `steps()` でスナップ。RGB ずれ付き | 保留 |

採用しなかった 2 つも動く状態で残してある。見比べるときは URL に `?pt=` を付ける。

```
/?pt=louver    /?pt=glitch    /?pt=grid    /?pt=off （既定に戻す）
```

指定は `localStorage` に残るので、一度開けばあとは普通にリンクを辿るだけでよい。
`/skills` へのリンクだけは `NeonPanelTransition` なので対象外。

見せ方を増やすときは `curtains/types.ts` の `Curtain` を実装して
`curtains/index.ts` の `CURTAINS` に足す。

`gsap` 3.13 は全プラグイン同梱なので、`Flip` / `Observer` / `Draggable` /
`ScrollToPlugin` / `SplitText` なども追加インストールなしで `gsap/<Name>` から import できる。

### 書くときの決まりごと

- **動きを減らす設定に必ず対応する。** `gsap.matchMedia()` の
  `(prefers-reduced-motion: no-preference)` で包み、その設定ではアニメーションを作らない。
  自動で動き続けるもの（マーキー等）は、止めた結果コンテンツに到達できなくならないか確認する。
- **`matchMedia` はどの条件も match しないとコールバックを呼ばない。** ブレークポイントで
  出し分けるときは排他な2本（`isMobile` / `isDesktop`）を必ず書く。片方だけ書くと
  もう片方の画面幅で丸ごと動かなくなる。
- **`ScrollTrigger` は `timeline` の vars に混ぜず、後から `ScrollTrigger.create()` で作る。**
  vars に書くと、生成時の refresh で `onLeave` 等が呼ばれたときに timeline が未初期化になりうる。
- **後片付けは `gsap.context()` + `ctx.revert()` か `matchMedia` の `mm.revert()` で行う。**
  ルート遷移で `pin-spacer` や inline style が residue として残らないようにする。
- **スクロール量で位置を決めるものは `pin` / `scrub` を使い、自前 rAF ループを書かない。**
  毎フレームの `getBoundingClientRect()` は強制レイアウトになる。
- **1 つのプロパティを複数の ScrollTrigger で触らない。** スクラブしているトリガーは
  範囲を過ぎたあとも終端の値を保持し続けるので、別のトリガーが同じプロパティを
  書いても打ち消される。持ち主を 1 つに決め、必要なら同じ timeline にまとめる。
- **要素を隠しておく初期状態は JSX の inline style で書く。** `gsap.set` だけに任せると、
  それが走るまでの間は素の状態（= 見えている）で描かれてしまう。
- **静的なずらしと GSAP のアニメーションを両方 transform で書かない。** GSAP が
  transform を専有するので打ち消される。静的なほうは `top` / `left` で書く。

## sections/ — ページ構成単位

各ルートが組み合わせて1ページを作る単位。使用技術は混在する。

| ファイル | 使用技術 |
|---|---|
| `TopSection.tsx` | `webgl/WebGLScene` を呼ぶ |
| `ProjectsIntoro.tsx` | Swiper + `webgl/DistortOverlay`。イントロ演出は `gsap/ProjectsIntroReel` に委譲 |
| `AboutSection.tsx` | IntersectionObserver（歪み演出のみ）。動きは `gsap/HeroBandParallax` / `gsap/CharReveal` / `gsap/StrengthParallax` に委譲 |
| `HobbySection.tsx` | CSS チルト + `ui/CurtainModal` 風のズームモーダル。開閉は `gsap/ZoomFlip` に委譲 |
| `SkillBarsAbout.tsx` | CSS transition + IntersectionObserver |
| `ContactSection.tsx` | GSAP ScrollTrigger（順次点灯）+ `webgl/NeonParticleStars` |
| `WorksSection.tsx` | CSS のみ。`ui/InfiniteMarquee` を使う |

`HobbySection` / `SkillBarsAbout` は `AboutSection` の内部パーツ。

## ui/ — 汎用パーツ

ページ構成に依存しない汎用パーツ。基本は CSS・IntersectionObserver で動く。

| ファイル | 役割 |
|---|---|
| `header.tsx` | 共通レイアウト |
| `Footer.tsx` | 共通レイアウト。透かしのパララックスは `gsap/WatermarkParallax` に委譲 |
| `PageTransition.tsx` | 遷移演出の Context。実装は `gsap/` に委譲 |
| `Loader.tsx` | タイプ演出付きローダー |
| `GlitchText.tsx` / `FadeInText.tsx` | テキスト演出 |
| `InfiniteMarquee.tsx` | 無限スクロール。レイアウト計算のみ担当し、動きは `gsap/MarqueeLoop` に委譲 |
| `CurtainModal.tsx` | Works の詳細モーダル |

## 注意

- `public/` は原本の保管場所ではない（[scripts/optimize-images.mjs](../../../scripts/optimize-images.mjs) 参照）。
  画像を追加したら `npm run images` で確認し、`npm run images:apply` で WebP に変換する。
- `@/*` → `src/*` のパスエイリアスが tsconfig に設定済み（現状は未使用）。
- CSS カスタムプロパティを `style` に渡すときは、オブジェクト全体を
  `as React.CSSProperties` でアサーションする（`["--x" as any]` は書かない）。
  `React.CSSProperties` に `--*` のキーが無いための回避なので、キーごとではなく
  一度だけキャストするのが読みやすい。

## TODO

### `<img>` を `next/image` に置き換える

`eslint` の `@next/next/no-img-element` が 4 箇所残っている。どれも素直に差し替えられない
事情があるので、対応するときは個別に判断すること。

| 箇所 | 事情 |
|---|---|
| [`sections/ProjectsIntoro.tsx:129`](sections/ProjectsIntoro.tsx) | イントロのカード。`gsap` が transform を当てる対象で、かつ `webgl/DistortOverlay` が `img[data-distort]` で拾っている。読み込みも `new Image()` + `decode()` で自前に待っている |
| [`sections/ProjectsIntoro.tsx:162`](sections/ProjectsIntoro.tsx) | Swiper のスライド。上と同じく `data-distort` の対象 |
| [`sections/WorksSection.tsx:306`](sections/WorksSection.tsx) | 親が `width` / `height` を inline style で持ち、`object-contain` で中央寄せしている。`fill` に置き換えるなら親の positioning を整理する必要がある |
| [`ui/CurtainModal.tsx:169`](ui/CurtainModal.tsx) | ギャラリー。1 枚目と 2 枚目以降で幅が変わり、高さは `max-h` 任せなので寸法が事前に決まらない |

### アクセシビリティ

- `ui/InfiniteMarquee.tsx` は 5 秒以上自動で流れ続けるが、キーボードから止める手段が無い
  （WCAG 2.2.2）。ホバー停止はポインタがある環境にしか効かない。
- `sections/HobbySection.tsx` のモーダルは `inert` でフォーカストラップしているが、
  `inert` 非対応の古いブラウザでは効かない。
