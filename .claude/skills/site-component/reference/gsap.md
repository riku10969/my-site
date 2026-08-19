# GSAP

`gsap` 3.13 は **全プラグイン同梱**。追加インストールなしで `gsap/<Name>` から
import できる（Club GreenSock のものも含む）。

## この repo で使っている技術

| import | 何をするもの | 使っている場所 |
|---|---|---|
| `gsap` | tween / timeline の本体 | 全体 |
| `gsap/ScrollTrigger` | スクロール位置と再生位置を結ぶ | 大半のパララックス |
| `gsap/Flip` | 「今の見た目 → 別の見た目」を差分から補間 | `ZoomFlip`（タイル→拡大） |
| `gsap/CustomEase` | ベジェを文字列で定義した ease | `SkillLayerTimeline` |
| `gsap/SplitText` | テキストを文字・単語・行に分割 | `CharReveal` |

まだ使っていないが同梱されているもの: `Observer`（スクロール/ドラッグ/ホイールを
統一して拾う）、`Draggable`、`ScrollToPlugin`、`MotionPathPlugin`、`ScrollSmoother`。

## 中心になる API

| API | 用途 | 注意 |
|---|---|---|
| `gsap.timeline()` | 複数 tween を時間軸に並べる | vars に `scrollTrigger` を混ぜない（下記） |
| `gsap.set()` | 即時に値を当てる（アニメーションしない） | 初期状態の隠しには使わない（下記） |
| `gsap.fromTo()` | 開始値と終了値を両方明示 | 途中から見えても値が確定する |
| `gsap.matchMedia()` | メディアクエリごとにセットアップを分ける | 排他な 2 本を必ず書く |
| `gsap.context()` | 作ったものをまとめて `revert()` する箱 | `matchMedia` を使うなら `mm.revert()` だけでよい |
| `ScrollTrigger.create()` | トリガーを単体で作る | `animation:` に timeline を渡す |
| `gsap.utils.clamp / mapRange` | 数値の丸め・写像 | 自前で書かない |

## 雛形 — スクラブするフック

`gsap/WatermarkParallax.tsx` が最小形。これを写すのが早い。

```tsx
"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useThing(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    // 動きを減らす設定では何も作らない。
    // （match しない条件のコールバックは走らないので、CSS 側の既定値が残る）
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(el, { yPercent: 20 }, { yPercent: 0, ease: "none" });

      // vars に混ぜず、後から作る
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom bottom",
        scrub: true,
        animation: tl,
      });

      return () => {
        st.kill();
        tl.kill();
      };
    });

    return () => mm.revert();
  }, [ref]);
}
```

## start / end の読み方

`"<trigger の位置> <viewport の位置>"`。

| 文字列 | 意味 |
|---|---|
| `"top bottom"` | trigger の上端がビューポート下端に来た時点（＝入り始め） |
| `"bottom bottom"` | trigger の下端がビューポート下端に来た時点 |
| `"top 70%"` | trigger の上端がビューポート高さの 70% に来た時点 |

`scrub: true` はスクロール量に追従、`scrub: 1` は 1 秒かけて追いつく（慣性が出る）。

## 落とし穴

- **`scrollTrigger` を timeline の vars に書かない。** 生成時の refresh で `onLeave`
  などが呼ばれると、timeline がまだ初期化されていないことがある。
  `ScrollTrigger.create({ animation: tl })` で後から結ぶ
- **`matchMedia` はどの条件も match しないとコールバックを呼ばない。** ブレークポイントで
  出し分けるなら排他な 2 本（`isMobile` / `isDesktop`）を必ず書く。片方だけだと
  もう片方の画面幅で丸ごと動かない
- **1 つのプロパティを複数の ScrollTrigger で触らない。** スクラブしているトリガーは
  範囲を過ぎたあとも終端の値を保持し続けるので、別のトリガーが同じプロパティを
  書いても打ち消される。持ち主を 1 つに決め、必要なら同じ timeline にまとめる
- **隠しておく初期状態は JSX の inline style に書く。** `gsap.set` だけに任せると、
  それが走るまでの 1 フレームは素の状態（＝見えている）で描かれる
- **静的なずらしと GSAP を両方 transform で書かない。** GSAP が transform を専有するので
  静的なほうが消える。静的なずらしは `top` / `left`、あるいはラッパーを 1 枚挟んで
  層を分ける（`SkillIntroStage` の「回転 / 斜め / 登場」が 3 層に分かれているのはこれ）
- **`pin` を使うと `pin-spacer` が DOM に挿入される。** `revert()` を怠るとルート遷移で
  residue として残る。CSS の `position: sticky` で足りるなら pin を使わない
- **自前 rAF で `getBoundingClientRect()` を毎フレーム読まない。** 強制レイアウトになる。
  スクロール量で位置が決まるものは `scrub` に任せる

## CSS 変数をアニメーションさせる

DOM プロパティではなく CSS カスタムプロパティを書き換えると、見た目の定義を
CSS 側に置いたままにできる（`WatermarkParallax` / `StackSection`）。

```tsx
gsap.fromTo(el, { "--wm-y": "24px" }, { "--wm-y": "-6px", ease: "none", /* ... */ });
```

TypeScript 側で `style` に渡すときは、キーごとではなく**オブジェクト全体**を
`as React.CSSProperties` でアサーションする（`["--x" as any]` は書かない）。
