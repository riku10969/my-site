# 汎用パターン

技術に依らず、この repo で繰り返し使っている作り方。

## フックにするかコンポーネントにするか

| | 判断 |
|---|---|
| **フック**（`useXxx`） | マークアップは呼び出し側が持ち、動きだけ渡す。既定 |
| **コンポーネント** | マークアップとタイムラインが不可分で、切り離すと壊れるとき |

現状コンポーネントなのは `StrengthParallax` と `CharReveal` の 2 つだけ。
迷ったらフックにする（呼び出し側がマークアップを自由に組める）。

## 「見た目は CSS、位置だけ JS」に寄せる

動きの定義を JS に全部持たせず、**CSS カスタムプロパティを 1〜2 個だけ JS が書く**形にすると、
見た目の調整が CSS 側で完結する。

```
JS  : --wm-y / --wm-o をスクロール量で書き換える
CSS : transform: translateY(var(--wm-y)); opacity: var(--wm-o);
```

利点は、**JS が走る前でも CSS の既定値で成立する**こと。reduced-motion で JS が
何も作らなくても、初期値のまま静止して見える。

## 数値の持ち主を 1 つに決める

同じ数値を CSS と JS の両方に書かない。噛み合わなくなったときに気付けない。

例: 重ね積みの「読ませる区間」の比率は `SkillLayerTimeline` の `HOLD_RATIO` **だけ**が
持ち、`StackSection` の prop 経由で CSS の `--s-hold` に流し込む。CSS 側に数字を
書き足さない。

色も同じ。`Skill.accent`（6 桁 hex）の 1 か所から、番号のネオン・ヘアライン・
発光・背景の数字を全部組む。

## 状態を「理由の Set」で持つ

止める / 隠す理由が複数同時に立ちうるとき、boolean 1 個だと後から来た理由が
先の理由を上書きしてしまう。

```ts
const reasons = new Set<string>();
const setPaused = (reason: string, on: boolean) => {
  on ? reasons.add(reason) : reasons.delete(reason);
  paused = reasons.size > 0; // ひとつでも残っていれば止め続ける
};
```

`MarqueeLoop`（ホバー / 画面外 / ドラッグ中）と `SkillIntroStage`（タブ非表示 / 画面外）
が同じ形。

## Observer 系は「最初から外」だと呼ばれない

`IntersectionObserver` も ScrollTrigger の `onToggle` も、**状態が変わったとき**に呼ばれる。
初期状態が既に「画面外」なら一度も呼ばれず、止まらないまま回り続ける。
セットアップ直後に初期状態を自分で 1 回反映する。

## 動きを減らす設定（`prefers-reduced-motion`）

- GSAP は `gsap.matchMedia()` の `(prefers-reduced-motion: no-preference)` で包む
- 素の CSS / rAF は `window.matchMedia("(prefers-reduced-motion: reduce)").matches` で分岐
- **止めた結果コンテンツに到達できなくならないか確認する。** 自動で流れるマーキーを
  止めるだけだと、隠れている項目に永久に届かないことがある

## モバイルの 100vh 問題

URL バーの伸縮で `100vh` はズレる。**`svh` を使う**（`100svh`）。
固定ヘッダーぶんは CSS 変数で引く（`calc(100svh - var(--s-head))`）。

## sticky で重ねる（GSAP の pin を使わない）

箱を縦に伸ばし、「次に覆わせたいぶん」だけを負の `margin-bottom` で文書から引く。
伸ばしたぶんが `position: sticky` の張り付き区間になり、引いたぶんに次のセクションが
乗り上げる。`pin-spacer` が作られないので、ルート遷移で residue が残らない。

重なりの上下は **DOM 順**で決まる（`position: relative` なら後ろの兄弟が上）ので
z-index を振らなくてよい。

## Next.js まわり

- 動きを持つものは `"use client"`。ページ側は極力サーバーコンポーネントのまま
- `@/*` → `src/*` のパスエイリアスが tsconfig にある
- `<img>` は `@next/next/no-img-element` に引っかかる。`next/image` に置き換えられない
  事情があるものは README の TODO に理由付きで残す（黙って disable コメントを足さない）

## 見た目を詰める作業台を `/lab` に作る

パラメータを画面上でいじって確かめたいものは、サイトの導線から外した確認用ルートを
`src/app/lab/` に置く（`lab/logo3d` / `lab/top3d`）。URL 直打ちで開く。

## 差し替え可能な演出は「定義の配列」にする

ページ遷移の見せ方は `gsap/curtains/` に `Curtain` 型の実装を並べ、`index.ts` の
`CURTAINS` から選ぶ。同じ DOM を使い回すので増やしても DOM は増えない。
採用しなかった案も**動く状態で残し**、URL クエリ（`?pt=louver`）で見比べられるようにする。

## アクセシビリティで見落としやすいところ

- 5 秒以上自動で動き続けるものには**止める手段**が要る（WCAG 2.2.2）。
  ホバー停止はポインタのある環境にしか効かない
- モーダルの背後は `inert` で殺す。フォーカストラップを自前で書かない
