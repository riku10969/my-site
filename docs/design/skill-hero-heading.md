# /skills 見出しの拡大と、写真を文字の前後に分ける

見出し「Skill Detail」を横幅いっぱいまで大きくし、回転している写真が
**文字の後ろから前へ抜けていく**ようにする。前後の振り分けは汎用の土台として作る。

- 対象: [`sections/SkillHero.tsx`](../../src/app/components/sections/SkillHero.tsx) /
  [`webgl/SkillIntroStage.tsx`](../../src/app/components/webgl/SkillIntroStage.tsx) /
  新規 `webgl/splitStage.ts`
- 方針: **案2（canvas 2 枚で前後に分ける）**。モバイルも同じ作りにする
- 状態: **完了**（タスク 1〜8 すべて実施・検証済み）

---

## 0. follow.art の作りを読み直した結果（前回の説明の訂正）

前回「follow.art も案2（1 つのシーンを前後に分けている）」と説明したが、
アーカイブの CSS を精査したところ**違っていた。**

```css
.landing-1-intro-webgl canvas,
.landing-1-intro-webgl__canvas-wrapper { position: absolute; inset: 0 }

/* 1 枚目（JS が先頭に挿す）だけ奥へ送る */
.landing-1-intro-webgl canvas:first-child { z-index: -1 }

/* 斜め 35deg と登場のトランジションは「2 枚目」にしか掛かっていない */
.intro .landing-1-intro-webgl__canvas-wrapper canvas {
  transform: translateY(100%) rotate(35deg);
  transition: transform 1.5s cubic-bezier(.55,0,.1,1);
  transition-delay: 1s;
}
```

つまり follow.art の 2 枚は**前後に分けた同じシーンではない**。

| | 中身 | 見出しとの前後 |
|---|---|---|
| 1 枚目（`canvas:first-child`） | 全画面の背景。`rotate` は掛かっていない | 奥（`z-index: -1`） |
| 2 枚目（`__canvas-wrapper` 内） | 35deg 傾いた例の面。登場アニメもこちら | **手前**（見出しより後ろの DOM） |

**傾いた面は丸ごと見出しの前にある。** これは前回の整理でいう案1にあたる。

ご指示は案2なので案2で作る。案2は案1を含む（全オブジェクトを手前側に振れば
follow.art と同じ配置になる）ので、汎用の土台として作れば follow.art の並びも
その設定のひとつとして表現できる。土台の既定値をどちらに寄せるかは
タスク 6 で見た目を見て決める。

## 1. 要求

| # | 要求 | 現状 |
|---|---|---|
| 1 | 「Skill Detail」を横幅 max でもう少し大きく | `max-w-6xl`（1152px）内で `text-5xl / 6xl / 7xl`（48 / 60 / 72px） |
| 2 | 後ろの写真の存在感を上げる | 手前 `opacity .62` / 奥 `.3`。加えてスクリムが左を最大 90% 覆う |
| 3 | 写真が文字の隙間を縫って前面に来る | 不可（canvas は `data-inner` より前の DOM に 1 枚だけ） |
| 4 | 汎用的な作りにする | 今は円柱専用のコンポーネント |

## 2. 前後に分ける仕組み

### 2.1 重なり順

2 枚の canvas を文字の前後に置き、文字を挟む。

```
stage
├─ div.tilt  → canvas BACK    （奥に回った写真）
├─ スクリム / 淡い発光
├─ data-inner（見出し・説明・目次）
└─ div.tilt  → canvas FRONT   （手前に来た写真）pointer-events-none
```

**2 枚の canvas は完全に同じ箱でなければならない。** 傾き（`rotate(35deg)`）も
拡張（負の `inset`）も一致していないと、前後の絵が繋がらず段差になる。
ラッパーの class を定数で export し、呼び出し側が同じものを使うことで担保する。

### 2.2 前後の振り分けは静的に決まる（実装が安く済む）

いま円柱は 1 か所に**背中合わせで 2 枚**のメッシュを置いている
（外向き = 手前に来たときに見える / 内向き = 奥に回ったときに見える）。
この性質がそのまま使える。

| メッシュ | カメラを向くのは | 置くレイヤー |
|---|---|---|
| 外向き（`facing = 0`） | 円柱の**手前**にいる間 | FRONT |
| 内向き（`facing = π`） | 円柱の**奥**にいる間 | BACK |

`FrontSide` のカリングで、カメラを向いていない側は描かれない。だから
**レイヤーを一度決めれば毎フレームの振り分けが不要**になり、回転に伴って
自動的に「奥 → 手前 → 奥」と入れ替わる。要求 3 がそのまま満たされる。

汎用の土台としては毎フレーム判定できる口（`assign`）も用意するが、
今回の円柱では使わない。

### 2.3 描き方

シーンとカメラは 1 つ。`THREE.Layers` で分け、`camera.layers.set()` を
切り替えて 2 回描く。

```
camera.layers.set(LAYER_BACK);  backRenderer.render(scene, camera);
camera.layers.set(LAYER_FRONT); frontRenderer.render(scene, camera);
```

## 3. 汎用の土台 `webgl/splitStage.ts`

`ExtrudedSvg.ts` の前例に倣い **React 非依存**にする。呼び出し側（フック）が
ライフサイクルを持つ。

```ts
export type SplitStageOptions = {
  back: HTMLCanvasElement;
  /** 省略・生成失敗時は全部 back に描く（= 前後に分けない） */
  front?: HTMLCanvasElement | null;
  camera?: { fov?: number; near?: number; far?: number; z?: number };
  maxDpr?: number;
  /** 被写体を作る。戻り値は後片付け */
  build: (ctx: { scene: THREE.Scene; front: THREE.Layers; back: THREE.Layers }) => (() => void) | void;
  /** 毎フレーム進める。dt は秒。省略するとループを持たない */
  update?: (dt: number, scene: THREE.Scene) => void;
  /** 毎フレーム前後を振り分けたいときだけ渡す */
  assign?: (obj: THREE.Object3D, camera: THREE.PerspectiveCamera) => "front" | "back";
};

export function createSplitStage(o: SplitStageOptions): {
  render(): void;
  resize(): void;
  setPaused(reason: string, on: boolean): void;
  dispose(): void;
};
```

土台が持つ責務。いま `SkillIntroStage` に書いてあるものをここへ移す。

- 2 つの `WebGLRenderer`。**生成は個別に try/catch する**
- 1 つの `Scene` と `PerspectiveCamera` を共有し、レイヤーを切り替えて 2 回描く
- ループと、止める理由の Set 管理（`visibilitychange` / 画面外 / `prefers-reduced-motion`）
- resize（両 canvas。箱は CSS が決めるので `setSize(w, h, false)`）
- dispose（両 renderer と `build` の戻り値）

**縮退**: `front` が無い・作れない場合は全オブジェクトを back レイヤーへ落とす。
結果は今と同じ「全部が文字の後ろ」になり、絵が消えることはない。
iOS Safari のようにコンテキスト数に厳しい環境の保険にもなる。

（`BackgroundStage` / `NeonParticleStars` / `LogoCarousel3D` も同種のループと停止条件を
それぞれ持っているので、あとから寄せられる。今回はやらない）

## 4. 円柱側の変更

`SkillIntroStage` を**コンポーネントからフックに変える**。
マークアップ（2 枚のラッパーと canvas）は文字を挟むので呼び出し側にしか置けない。
README の「マークアップが呼び出し側にあるものはフック」に沿う。

```ts
export const SKILL_INTRO_TILT_CLASS =
  "pointer-events-none absolute inset-[-28%] rotate-[35deg]";

export function useSkillIntroStage(
  backRef: React.RefObject<HTMLCanvasElement | null>,
  frontRef: React.RefObject<HTMLCanvasElement | null>,
): void;
```

持つのは被写体の定義（6 枚・背中合わせ・cover UV・円柱の配置）と、
外向き / 内向きをどのレイヤーに置くかだけ。

## 5. 要求 1・2

### 見出し

`data-inner` の `max-w-6xl` から見出しだけを外し、`clamp()` で画面幅に追従させる。

- `text-[clamp(2.75rem,10.5vw,9rem)]` / `leading-[0.95]` / `tracking-tight`
- 2 行に折り返る前提で組む（1440 幅で約 150px になるため）
- 説明文と目次は今の `max-w-6xl` のまま

### 写真の存在感

- 手前 `.62` → `.85` 前後、奥 `.3` → `.45` 前後
- **スクリムを弱める。** 左を 90% 覆っているのが効きすぎている。
  手前の写真が文字の前へ出るので、文字の可読性はスクリムではなく
  見出し自身の発光で確保する方向に寄せる

## 6. リスクと対策

| リスク | 対策 |
|---|---|
| **2 枚の箱がずれると前後の絵が繋がらない** | ラッパーの class を定数で export して共有。タスク 4 で両 canvas の実測値が一致するか確認 |
| **WebGL コンテキストが 2 つになる。** README の「canvas は 1 枚だけ」に反する | `/skills` には他に canvas が無いので 2 で収まる。README に例外と理由を書く（タスク 8） |
| **塗る面積が倍。** 現状 2246×1081 / DPR 1.6 ≒ 6.2M px/枚 → 2 枚で 12.4M | 円柱の実効サイズは約 573px 幅しかないので、拡張率 `-28%` を下げられる見込み。タスク 7 で実測して決める |
| 手前の canvas が文字と目次の上に来る | ラッパーに `pointer-events-none`。目次が押せなくならないか確認 |
| front の生成に失敗した環境で写真が消える | 全部 back に落とす縮退を土台に持たせる（3 章） |
| 見出しを大きくすると円柱と重なる範囲が増える | 円柱の位置・大きさ（`CYL_SCREEN_RIGHT` / `CYL_SCREEN_UP` / `CYL_RADIUS`）も合わせて調整する。タスク 6 |

## 7. 実装タスク

- [x] **タスク 1**: `webgl/splitStage.ts` を新規作成（土台のみ。この時点では誰も使わないので描画は変わらない）
- [x] **タスク 2**: `SkillIntroStage` をフック化し、土台に載せ替える。傾きラッパーの class を export
- [x] **タスク 3**: `SkillHero` のマークアップを、文字を挟む 2 枚構成にする
- [x] **タスク 4**: 実機確認。前後に分かれているか、2 枚の箱が一致しているか、停止と復帰、reduced-motion、コンテキスト解放、front 失敗時の縮退。`npm run lint` / `npm run build`
- [x] **タスク 5**: 見出しを横幅 max + 拡大（要求 1）
- [x] **タスク 6**: 写真の存在感を上げる（不透明度・スクリム・円柱の位置）（要求 2）
- [x] **タスク 7**: 塗る面積の削減（拡張率の見直し）とモバイル幅（360 / 390 / 430）の確認
- [x] **タスク 8**: `components/README.md` を更新（`splitStage` の使い方、canvas 2 枚の例外と理由、follow.art の実際の並びについての訂正）

## 8. 検証項目

- 手前の写真が見出しの**前**に、奥の写真が**後ろ**に描かれている
- 回転に伴って前後が入れ替わる（同じ写真が奥 → 手前 → 奥と回る）
- 2 枚の canvas の箱（位置・寸法・transform）が一致している
- 画面外・タブ非表示で描画が 0 になり、戻ると再開する
- `prefers-reduced-motion: reduce` でループを持たず、両 canvas に 1 枚ずつ描く
- ページを離れると 2 つのコンテキストが解放される（往復してもコンテキスト上限の警告が出ない）
- front を作れない状況で、全部が back に描かれて絵が消えない
- 目次が手前の canvas に邪魔されず押せる
- 360 / 390 / 430 / 1440 幅で崩れない
- `npm run lint` の警告が既存 4 件から増えていない / `npm run build` が通る

---

## 9. 実施結果

### 検証（1440×900）

| 項目 | 結果 |
|---|---|
| canvas の枚数 | 2 |
| 2 枚の箱の一致 | 位置・寸法・buffer・transform すべて同一 |
| DOM 順 | canvas(奥) → 装飾 → **data-inner（文字）** → canvas(手前) |
| 前後の見え方 | 手前に来た写真が「Detail」の上を通り、奥に回ると文字の後ろへ抜ける |
| 描画の停止 / 復帰 | 画面内 220 → 画面外 **0.0** → 復帰 228 draw/秒 |
| reduced-motion | 0.0 draw/秒・初期 42 draw のみ（両 canvas に静止画） |
| コンテキスト解放 | 往復 11 回のあとも canvas 2 枚・両方描画可・警告なし |
| **front 失敗時の縮退** | `front: null` を渡して実測。全 6 枚が奥に描かれ絵が欠けない |
| lint / build | 警告は既存 4 件のまま / build 成功 |

### 見出し（要求 1）

`data-inner` の `max-w-6xl` を外し、`clamp(2.75rem, 10.5vw, 9rem)` に。
1440 幅で **144px / 幅 1328px**（ステージのパディング幅いっぱい）。
説明文は `max-w-[48ch]`、目次は `max-w-6xl` を自分で持つ形にした。

### 写真の存在感（要求 2）

手前 `.62 → .85`、奥 `.3 → .45`。スクリムも弱めた（左 90% → 70%）。

### 塗る面積

| | canvas 1 枚 | 2 枚合計 | 画面の何倍 |
|---|---|---|---|
| 1440×900 (DPR2) | 2232×1296 | 5.79M px | **1.1x** |
| 390×780 (DPR3) | 605×1116 | 1.35M px | 0.5x |
| 360×740 (DPR3) | 557×1116 | 1.24M px | 0.5x |

`inset` を `-28%` → `-12%`、`MAX_DPR` を `1.6` → `1.25` に下げた。
中身は不透明度を落とした写真なので甘くなっても分からない。

### 途中で直したこと

**縦長の画面で円柱が視野幅の 87% を占め、モバイルの本文を潰した。**
カメラの画角と距離を固定すると「見える範囲の高さ」は一定だが幅は aspect 次第で、
ワールドの絶対値で位置と大きさを持っていたのが原因。`splitStage` に `onResize` を
足し、`visibleWidth` / `visibleHeight` に対する**比**で決めるようにした。
寄せ方も横長 / 縦長で補間する（縦長では説明文を避けて見出しの帯まで上げる）。

### 残っていること

- 実機（本物の GPU / タッチ端末）での体感は未確認。検証は swiftshader
- `BackgroundStage` / `NeonParticleStars` / `LogoCarousel3D` のループと停止条件を
  `splitStage` に寄せる余地がある（今回は手を付けていない）

---

## 10. 指摘を受けての修正（要求 2・3 が効いていなかった）

「② 写真の存在感」「③ 文字の隙間を縫って前面に」がどちらも成立していないと指摘を受け、
片方の canvas を `display: none` にして中身を切り分けて確かめた。

### 分かったこと

**前後の分離そのものは正しく動いていた。** 計装で確認した実測（1 位置につき背中合わせ 2 枚）:

| worldZ | mask | opacity | どちら |
|---|---|---|---|
| +1.91 / +1.26 / +0.65 | 2（FRONT） | 0.95 | 近い側で見える |
| −0.65 / −1.26 / −1.91 | 1（BACK） | 0.26 | 遠い側で見える |

**効いていなかった原因は 2 つとも「値の詰め」だった。**

1. **③ が見えなかったのは、円柱が見出しの文字に一度も重なっていなかったから。**
   `CYL_LAYOUT_WIDE.right = 0.18` は視野幅の 18%、つまり中心が文字の右外に出ていた。
   文字は x 56〜830 に対し、円柱は x 840〜1280 に居た。前後に分かれていても
   重ならなければ「縫う」動きは一切見えない。
   → `right` を **0.18 → 0.0** に。文字の帯に中心を寄せた。

2. **② が逆に見えたのは、前後の不透明度の差が写真そのものの明暗に負けていたから。**
   `.85` / `.45` では、白背景の写真（`design3`）が奥に回っているとき奥のほうが
   明るく見えてしまう。
   → 手前 **.85 → .95**、奥 **.45 → .26** に広げた。

### 修正後の確認

| | 結果 |
|---|---|
| 手前だけ表示 | 明るい写真が「Detail」の "ail" を覆う（文字が隠れる） |
| 両方表示・位相 1 | "ail" が写真に覆われ、他の文字は手前に出る |
| 両方表示・位相 3 | "l" が写真の手前に出る（奥に回った写真は文字に負ける） |
| 説明文・目次 | どの位相でも覆われない |
| 塗る面積 | 変わらず（desktop 1.1x / mobile 0.5x） |

### 反省

前回「できました」と報告したが、確認が**両方の canvas を重ねた 1 枚のスクリーンショットを
目で見ただけ**だった。重なりが浅く、たまたま前後の判別がつかない位相を見て「動いている」と
判断していた。**片方ずつ隠して中身を切り分ける**、**文字の矩形と被写体の位置を数値で比べる**
のどちらかをやれば最初に気づけた。以後この 2 つを検証項目に入れる。
