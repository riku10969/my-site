---
name: site-component
description: src/app/components/ 配下のコンポーネントを追加・変更するときの決まりごと。GSAP（ScrollTrigger / Flip / SplitText）、Three.js / WebGL / GLSL、CSS の sticky 重ね積み、reduced-motion 対応、components/README.md の更新まで。「アニメーションを足す」「セクションを作る」「パララックス」「シェーダー」「ページ遷移」などの依頼で使う。
---

# コンポーネントを足す・直す

## 1. 置き場所を決める

アニメーション技術が主役なら技術名、それ以外は役割で分ける。

| 置き場所 | 入れるもの |
|---|---|
| `webgl/` | `three` を直接使い `<canvas>` に描くもの。全て `"use client"` |
| `gsap/` | `gsap` のタイムラインが主役のもの |
| `sections/` | ページ構成単位。使用技術は混在してよい |
| `ui/` | ページ構成に依存しない汎用パーツ |

マークアップが呼び出し側にあるならフック（`useXxx`）、マークアップとタイムラインが
不可分ならコンポーネントを export する。既定はフック。

## 2. 技術ごとのやり方

**書き始める前に、該当するものを読む。** 雛形と落とし穴が入っている。

| 読むもの | 中身 |
|---|---|
| [reference/gsap.md](reference/gsap.md) | プラグイン一覧、スクラブするフックの雛形、`start`/`end` の読み方、`matchMedia` / `context` の落とし穴 |
| [reference/webgl.md](reference/webgl.md) | Three.js のクラス一覧、canvas コンポーネントの雛形、dispose の対応表、rAF の止め方 |
| [reference/patterns.md](reference/patterns.md) | 技術に依らない汎用パターン（CSS 変数への逃がし方、理由の Set、sticky 重ね積み、svh、a11y） |

さらに細かい経緯（なぜその作りにしたか、採らなかった案）は
[`src/app/components/README.md`](../../../src/app/components/README.md) にある。

## 3. 何があっても外せない 6 つ

1. **動きを減らす設定に必ず対応する。** GSAP は `gsap.matchMedia()` の
   `(prefers-reduced-motion: no-preference)` で包む
2. **`matchMedia` で出し分けるなら排他な 2 本を書く。** 片方だけだと、もう片方の
   画面幅で丸ごと動かない
3. **`ScrollTrigger` は timeline の vars に混ぜず `ScrollTrigger.create()` で後から作る**
4. **後片付けは `mm.revert()` / `ctx.revert()`。** WebGL は作った側が dispose する
   （material を捨てても `map` は残る）
5. **1 つのプロパティを複数の ScrollTrigger で触らない。** 持ち主を 1 つに決め、
   必要なら同じ timeline にまとめる
6. **静的なずらしと GSAP を両方 transform で書かない。** 静的なほうは `top` / `left`、
   または層を分ける

## 4. README を更新する

**コンポーネントを足したら [`src/app/components/README.md`](../../../src/app/components/README.md)
の該当ディレクトリの表に 1 行足す。** これは任意ではなく、この repo の運用。

- 「何をするか」ではなく「画面で何が起きるか」を書く
- `gsap/` の表は呼び出し元の列も埋める
- フックかコンポーネントかが分かるようにする
- **引っかかった点は箇条書きで残す。** なぜその作りにしたか、採らなかった案と
  その理由まで書く。既存の節がその濃さで書かれている

## 5. 確認

```
npm run lint
```

画像を足したなら `npm run images` で確認 → `npm run images:apply` で WebP 化。
`public/` は原本の置き場ではない。
