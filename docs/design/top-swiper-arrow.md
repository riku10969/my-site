# トップページの矢印をサイトに馴染ませる

/ の Projects カルーセルの左右送りボタンを、Swiper の素の見た目から
このサイトのトーンに合わせたものへ差し替える。

- 対象: [`sections/ProjectsIntoro.tsx`](../../src/app/components/sections/ProjectsIntoro.tsx) /
  [`styles/ProjectsSwiper.module.css`](../../src/app/styles/ProjectsSwiper.module.css)
- 方針: **A（サイトに馴染ませる）**。矢印は残す
- 状態: **完了**（タスク 1〜5 すべて実施・検証済み）

---

## 1. 現状と問題

`Navigation` モジュールと `swiper/css/navigation` を入れているだけで、
`.swiper-button-*` へのカスタム指定が 1 つも無いため Swiper の素の見た目が出ている。

実測（1440×900）:

| | 値 |
|---|---|
| 色 | `#007aff`（Swiper 既定の `--swiper-theme-color`。iOS ブルー） |
| 寸法 | 27 × 44 px |
| 位置 | 左 `x=10` / 右 `x=1403`（`--swiper-navigation-sides-offset` の既定 10px） |
| 字形 | `content: "prev" / "next"` を `swiper-icons` Web フォントで置換 |
| `aria-label` | **null**（`a11y` モジュール未導入） |

問題は 4 つ。

1. **色がパレットに無い。** サイトは cyan `#2ccdb9` / purple `#8a5cff` / amber `#ffb34d` /
   neon white で構成されていて、この青はどこにも使っていない。背景が砂嵐ノイズの
   暗いグレーなので彩度の高い青だけが浮く。
2. **カードから遠い。** 画面の左右端に張り付いていて、操作対象のカード（中央・
   最大 640px）とは 350px 以上離れている。何を送るものか結びつかない。
3. **アイコンフォント依存。** Web フォントの読み込みに失敗すると
   **「prev」「next」という英単語がそのまま出る。**
4. **`aria-label` が無い。** 支援技術には上記の生の文字列が渡る。

## 2. 前提として確認したこと

- 矢印を消すと**手動で送る手段が無くなる**（カードの `onClick` は「送る」ではなく
  ページ遷移。`Keyboard` モジュールも未導入）。だから A を選んでいる。
- `loop` が有効なので `swiper-button-disabled` にはならない。無効状態の見た目は不要。
- トップは `ScrollLock` でスクロールしないので、矢印は常に画面内にある。
- **モバイルのカード幅は、この矢印を避けるために縮めてある。**
  `ProjectsSwiper.module.css` の `@media (max-width: 768px)` に
  `--max-w: 68vw` があり、コメントに「80vw だと矢印との隙間が 3〜10px しか
  残らないので 68vw まで下げた」と書かれている。**矢印の位置を変えるならここも
  合わせて見直す必要がある**（本設計のタスク 4）。
- `DistortOverlay` は `img[data-distort]` を対象にしているので、ボタンは影響を受けない。

## 3. 変更後の仕様

### 3.1 マークアップ

`navigation` の真偽値指定をやめ、**自前の要素を `prevEl` / `nextEl` として渡す**。
CSS で `::after` を上書きするだけでは字形をフォントに依存したままになり、
`aria-label` も付けられないため。

```
<button type="button" ref={prevRef} className={styles.navBtn} aria-label="前の作品を見る">
  <svg viewBox="0 0 24 24" aria-hidden focusable="false">
    <path d="M15 5 L8 12 L15 19" />   {/* 線だけ。fill なし */}
  </svg>
</button>
```

- `<div>` ではなく `<button type="button">`。キーボードで届き、Enter / Space で押せる
- 字形は**インライン SVG のパス**。Web フォント依存が消え、線の太さを
  サイトの細い印象に合わせられる（`stroke-width: 1.5`）
- SVG は `aria-hidden` にし、意味は `aria-label` が持つ
- `type="button"` を明示（将来 form 内に置かれても submit しない）

### 3.2 見た目

| | 値 | 理由 |
|---|---|---|
| 色（通常） | `rgba(255,255,255,.72)`（当初 .55 から引き上げ） | パレットに無い青をやめる。白系なら 3 色のアクセントどれとも喧嘩しない |
| 色（hover / focus） | `#fff` + `neon-white` 相当の `text-shadow` / `drop-shadow` | 既存の `.neon-white` と同じ光り方に寄せる |
| 線 | `stroke-width: 1.5`、`stroke-linecap: round`、`fill: none` | サイトの細い字面に合わせる |
| 当たり判定 | 44 × 44 px 以上 | 見た目の線は細くても指で押せる大きさを保つ |
| 位置 | カードの端に合わせる。`max(6px, calc(50% - min(40vw, 320px)))` | 端に張り付かせず、カードとの関係が読めるようにする |
| トランジション | `opacity` / `filter` を 0.25s | 既存の `.swiperShell` などと同じ速さ感 |

**色をスライドのアクセント色に追従させるかは、今回はやらない。**
`activeIndex % 3` で cyan / purple / amber を出す仕組みが `titleArea` にあるので
流用はできるが、3 秒ごとに矢印の色が変わるのは目が散る。白系で固定し、
必要になったら別途検討する。

### 3.3 フォーカスの見え方

`:focus-visible` でリングを出す。既存の Footer が
`focus-visible:ring-2 focus-visible:ring-white/40` を使っているのでそれに合わせる。

### 3.4 スタイルの置き場所

`styles/ProjectsSwiper.module.css`。
`components/README.md` の「コンポーネント固有のスタイルは CSS Modules か Tailwind」に従う。
`globals.css` は「複数のコンポーネントから使う演出」か「ライブラリが吐く DOM」に限る決まりで、
自前の要素を使うようになるので後者にも当たらない。

## 4. リスクと対策

| リスク | 対策 |
|---|---|
| **`prevEl` / `nextEl` に ref を渡すと初期化に間に合わないことがある。** Swiper のインスタンス生成が React の ref 確定より先だと `null` が渡り、押しても効かない | `onBeforeInit` の中で `swiper.params.navigation.prevEl / nextEl` に代入する形にする。Swiper React の定石。タスク 3 で実機確認する |
| ボタンが `showSwiper` の分岐内にあるので、イントロ中は存在しない | 現状の素の矢印も同じ（イントロ中は無い）ので挙動は変わらない。実測でも intro 時点では要素が無いことを確認済み |
| モバイルで矢印とカードが重なる | タスク 4 で `--max-w: 68vw` の見直しとあわせて実測する |
| `swiper/css/navigation` を読まなくなると位置指定も消える | 自前 CSS で position を持つので問題ない。import を残すか外すかはタスク 2 で判断（残すと `.swiper-button-*` の既定が効くので**外す**方針） |

## 5. 実装タスク

- [x] **タスク 1**: `ProjectsSwiper.module.css` に `.navBtn` の見た目を足す（色・線・当たり判定・hover / focus-visible）。この時点では未使用なので描画は変わらない
- [x] **タスク 2**: `ProjectsIntoro.tsx` のマークアップを差し替える。`navigation` 真偽値 → `onBeforeInit` + `prevEl` / `nextEl`、`<button>` + インライン SVG、`aria-label` 付与、`swiper/css/navigation` の import を外す
- [x] **タスク 3**: 実機確認（1440×900）。送りが左右とも効くか、フォーカスが見えるか、キーボードで押せるか、`aria-label` が付いたか。`npm run lint` / `npm run build`
- [x] **タスク 4**: モバイル幅（360 / 390 / 430）で確認し、`--max-w: 68vw` を戻せるか判断。戻すならコメントも書き換える
- [x] **タスク 5**: `components/README.md` に一行足す（Swiper の矢印を自前要素に置き換えた旨と、`swiper/css/navigation` を読んでいない理由）

## 6. 検証項目

- 左右の送りが効く（`onSlideChange` で `titleArea` の文字が変わる）
- `aria-label` が付いている
- Tab で到達でき、`:focus-visible` のリングが見える
- Enter / Space で送れる
- Web フォントに依存しない（`swiper-icons` を読まなくても字形が出る）
- 360 / 390 / 430 / 1440 幅でカードに重ならない
- `npm run lint` の警告が既存 4 件から増えていない / `npm run build` が通る

---

## 7. 実施結果

### 検証（1440×900）

| 項目 | 結果 |
|---|---|
| `.swiper-button-*` の残存 | 0 個 |
| `swiper-icons` に依存する要素 | 0 個 |
| ボタン | `<button type="button">` / `aria-label` あり / SVG は `aria-hidden="true"` |
| 当たり判定 | 44 × 44 px |
| `z-index` | 20（`.swiper-slide-active` の 10 より上） |
| カードとの位置 | カード 450〜990 に対し 左 400〜444 / 右 996〜1040（外側 6px） |
| クリック送り | About →(次) Contact →(前) About |
| Tab 到達順 | About → Works → Contact → 前 → 次（自然な順） |
| `:focus-visible` | `rgba(255,255,255,.4) 0 0 0 2px` が出る |
| Enter | 送れる |
| lint / build | 警告は既存 4 件のまま / build 成功 |

`.focus()` では `:focus-visible` が当たらない（ブラウザの仕様）。実際に Tab キーを
送って確認した。

### モバイル（390×780 で計測、360 / 430 も確認）

`--max-w` を **68vw → 80vw に戻した**（`--max-h` も 37vh → 43vh）。
既定の矢印を避けるための妥協が不要になったため。

| 幅 | カード幅 | 写真への重なり | 画面外へ出ていないか |
|---|---|---|---|
| 360px | 288px（旧 245px） | 左右 44px | 出ていない |
| 390px | 312px（旧 265px） | 左右 44px | 出ていない |
| 430px | 344px（旧 292px） | 左右 44px | 出ていない |

### 途中で直したこと

矢印が乗る領域の写真の明るさを 3 スライドぶん測ったところ、Works が
**平均輝度 110 / 255** で、当初の `rgba(255,255,255,.55)` では弱かった。
操作するものなので見つけやすさを優先し `.72` へ上げ、`drop-shadow` も二段にした。

| スライド | 矢印が乗る領域の平均輝度 |
|---|---|
| About | 60 / 255 |
| Contact | 25 / 255 |
| Works | **110 / 255** |

### 残っていること

- 実機（本物のタッチ端末）での押しやすさは未確認。44px は確保している
- スライドのアクセント色への追従は意図的に未実装（3 秒ごとに色が変わると目が散る）
