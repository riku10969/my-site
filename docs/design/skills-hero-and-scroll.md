# /skills の見出しの面とスクロール量

対象: `/skills`（重ね積みのページ）

1. 見出しの回る円柱を、ページを開いた最初の描画から所定の位置に置く（登場の
   スライドインを無くす）
2. 重ね積み 1 枚あたりのスクロール量を増やす。写真の切り替えと次レイヤーへの
   移行が速いため。**モバイルは追加で多く**取る

---

## 1. 現状

### 見出しの面（回る円柱）

`gsap/SkillLayerTimeline` の `useSkillIntroEntrance` が、面のラッパーを
`yPercent: 100 → 0` / `delay: 1` / `duration: 1.5` で下からスライドインさせている。
スクロールには紐付いていない（単発のトゥイーン）が、

- 開いてから 1 秒は画面外、2.5 秒たつまで所定の位置に来ない
- その間は `webgl/SkillIntroStage` の IntersectionObserver が画面外と判定するので
  回転の rAF も止まっている

ので、開いた直後は「面が無い」状態になる。

### スクロール量

可視高 H = `100svh - 4rem`。1 レイヤーの箱は次の 3 区間でできている
（`styles/SkillStack.module.css`）。

| 区間 | 現在 |
|---|---|
| 下から上がってきて前を覆う | 1 H |
| 覆われず張り付いて読ませる（`HOLD_RATIO`） | 0.6 H |
| 次に覆われる | 1 H |

写真の切り替え（`flip` のめくり / `split` の順次表示）は読ませる区間の
`VARIANT_SPAN`（7 割）に収まるので、**0.42 H = ビューポート半分弱**で全カードが
めくれ切る。値はビューポート幅に依らず一定なので、指の一振りで大きく動く
モバイルではさらに速くなる。

見出しのレイヤーは `hold` を持たない（箱 = 2 H、覆われ始めが progress 0.5）。

---

## 2. 変更後の値

| | 現在 | 変更後 |
|---|---|---|
| `HOLD_RATIO`（768px 以上） | 0.6 | **1.2** |
| `HOLD_RATIO`（768px 未満） | 0.6 | **1.8** |
| 見出しの `hold`（幅共通） | 0（既定） | **0.4** |

写真の切り替えに使えるスクロール量は 0.42 H → **0.84 H（デスクトップ）/
1.26 H（モバイル）**。`VARIANT_SPAN` と `stopsFor()` の式はそのまま使うので、
比率を変えるだけで切り替えも移行も同じ割合で遅くなる。

**副作用**: ページ全長が 1 レイヤーあたり +0.6 H（デスクトップ）/ +1.3 H
（モバイル）増える。6 枚 + 見出しで合計 +4.0 H / +8.2 H 程度。

見出しの `hold` は**幅で変えない**。変えると `useSkillHeroTimeline` の
`coverAt` も幅で分岐させることになり、matchMedia の本数が増えるだけで
得るものが少ない（見出しは読ませる文章が短い）。

---

## 3. データ構造 / API の変更

### `--s-hold` の持ち主を保ったまま幅で切り替える

現在は `StackSection` が `--s-hold` を inline style に直接書いている。inline style
の中ではメディアクエリが書けないので、**「数値 2 つを inline で渡し、どちらを使うかは
CSS のメディアクエリが選ぶ」**形に変える。数値の持ち主が JS 側 1 か所であることは
変わらない（README の決まりごとを維持）。

`styles/SkillStack.module.css`

```css
.section {
  --s-hold-sm: 0;               /* 既定。StackSection が inline で上書きする */
  --s-hold-md: 0;
  --s-hold-ratio: var(--s-hold-sm);
  --s-hold: calc(var(--s-visible) * var(--s-hold-ratio));
}
@media (min-width: 768px) {
  .section { --s-hold-ratio: var(--s-hold-md); }
}
```

`ui/StackSection` の prop

```ts
/** 覆われずに張り付いて待つ区間の長さ（可視高の倍数）。幅ごとに 2 つ渡す */
hold?: { sm: number; md: number };   // 既定 { sm: 0, md: 0 }
```

inline style は `--s-hold-sm` / `--s-hold-md` に**単位なしの数値**を文字列で書く。

### 境界の 768px は CSS と JS の 2 か所に出る

CSS のメディアクエリと JS の `gsap.matchMedia()` で同じ境界を見る必要があるが、
CSS の `@media` の値を JS から共有する手段が無い。`SkillLayerTimeline` に

```ts
export const HOLD_BREAKPOINT = 768;   // styles/SkillStack.module.css と揃える
```

を置き、両方のコメントで相互参照する。JS 側は `max-width: 767.98px` /
`min-width: 768px` の排他な 2 本にして、小数幅で穴が空かないようにする。

### `gsap.matchMedia()` の分岐は 3 本

README の「排他な分岐で全域を覆う」を守る。動きを減らす設定は幅に依らないので
1 本のまま。

| クエリ | 中身 |
|---|---|
| `(prefers-reduced-motion: no-preference) and (max-width: 767.98px)` | `HOLD_RATIO.sm` で timeline を組む |
| `(prefers-reduced-motion: no-preference) and (min-width: 768px)` | `HOLD_RATIO.md` で timeline を組む |
| `(prefers-reduced-motion: reduce)` | 現状のまま（見えるところまで `gsap.set`） |

timeline の組み立ては `build(hold)` に切り出して 2 本から呼ぶ。`stopsFor()` の
呼び出しも `build` の中へ移す（現在は `useEffect` 直下で 1 回だけ計算している）。

---

## 4. UI / 挙動の変化

- 見出しの面は**開いた瞬間から所定の位置にあり、回転もその場で始まる**。
  スライドインは無くなる（`useSkillIntroEntrance` を削除）。
- 見出しは 0.4 H ぶん、覆われずに留まってから 1 枚目に覆われ始める。
- 各レイヤーは読ませる区間が 2〜3 倍になり、写真のめくり・順次表示・横流し・
  奥行きパララックスがすべて同じ割合で緩やかになる。
- `prefers-reduced-motion: reduce` の見え方は変わらない（面は静止・写真は表示）。

---

## 5. 実装手順

- [x] **タスク 1** 見出しの面の登場アニメーションを外す
  - `gsap/SkillLayerTimeline`: `useSkillIntroEntrance` と `INTRO_DURATION` /
    `INTRO_DELAY` / `INTRO_EASE`、使われなくなる `CustomEase` の import と
    `registerPlugin` を削除
  - `sections/SkillHero`: 呼び出しと `introRef` を削除（ラッパーの div は
    `pointer-events-none` と DOM 順のために残す）
  - `npm run lint` / `npm run build`

- [x] **タスク 2** `hold` を幅で切り替えられるようにする（値は据え置き）
  - `styles/SkillStack.module.css`: `--s-hold-sm` / `--s-hold-md` /
    `--s-hold-ratio` を足し、`--s-hold` を計算で出す
  - `ui/StackSection`: `hold` prop を `{ sm, md }` に変更
  - `npm run lint` / `npm run build`

- [x] **タスク 3** `HOLD_RATIO` を `{ sm: 1.8, md: 1.2 }` にする
  - `gsap/SkillLayerTimeline`: `HOLD_RATIO` をオブジェクトに、`HOLD_BREAKPOINT`
    を追加、`useSkillLayerTimeline` の matchMedia を 3 分岐にして `build(hold)`
    を切り出す
  - `npm run lint` / `npm run build`

- [x] **タスク 4** 見出しに `hold` を持たせる
  - `HERO_HOLD_RATIO = 0.4` を追加し、`sections/SkillHero` が `StackSection` に渡す
  - `useSkillHeroTimeline` の `coverAt` を `0.5` 固定から
    `(1 + hold) / (2 + hold)` の計算に変える
  - `npm run lint` / `npm run build`

- [x] **タスク 5** ドキュメントを更新
  - `src/app/components/README.md`: 「登場」の行、`hold` の持ち主の説明、
    見出しは `hold` を持たないという記述、境界 768px の相互参照
  - `sections/SkillHero` / `webgl/SkillIntroStage` / `styles/SkillStack.module.css`
    の先頭コメント
  - `npm run lint` / `npm run build`

---

## 6. 検証

- `npm run lint` … `@next/next/no-img-element` の既知 4 件から増えていないこと
- `npm run build` … 型チェックを含めて通ること
- 手元の確認（`npm run dev`）
  - `/skills` を開いた最初の描画で面があり、回っている
  - デスクトップ幅とモバイル幅（768px 未満）でスクロール量が変わる
  - 幅を 768px の前後に跨いでリサイズしても、張り付き位置と写真の切り替わりが
    ずれない（CSS の箱と timeline の区切りが噛み合っている）
  - OS の「視差効果を減らす」を入れた状態で、面が静止し写真が表示されている

---

## 7. 実装後のメモ

- タスク 2 と 3 は統合して実装した（上記参照）。
- ページ全長は **デスクトップ約 14.6 H / モバイル約 18.2 H**（見出し 1.4 H +
  レイヤー 1〜5 が各 1+hold H + 最終レイヤー 1+hold H）。`webgl/SkillIntroStage` の
  「画面外で rAF を止める」コメントの画面数もこれに合わせて直した。
- `useSkillIntroEntrance` の削除にともない `CustomEase` の import と
  `registerPlugin` も落ちた（このファイルでの唯一の利用箇所だった）。
- 検証: `npm run lint` は既知の `@next/next/no-img-element` 4 件のみ、
  `npx tsc --noEmit` と `npm run build` は通過。
