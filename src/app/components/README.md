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
| `BackgroundStage.tsx` | トップ全体の背景。`shaders/` のノイズシェーダーを平面に適用 |
| `splitStage.ts` | 1 つのシーンを**2 枚の canvas に前後で振り分けて描く**土台。あいだに DOM を挟める（React 非依存） |
| `SkillIntroStage.tsx` | Skills の見出しに敷く、枠なしの写真 6 枚が円柱状に並んで回る面（フック） |
| `NeonParticleStars.tsx` | Contact セクションのパーティクル |
| `DistortOverlay.tsx` | Projects イントロの歪みオーバーレイ |
| `ExtrudedSvg.ts` | SVG のパスを押し出して 3D の塊にする（React 非依存） |
| `Logo3DPreview.tsx` | `ExtrudedSvg` の見た目を確かめる確認用ビュー |
| `shaders/` | GLSL を文字列でエクスポート（vertex / fragment） |

### SVG を押し出す（`ExtrudedSvg.ts`）

`public/projects/*.svg` を `SVGLoader` → `ExtrudeGeometry` で 3D にする。
見た目を詰めるための作業台が [`/lab/logo3d`](../../lab/logo3d/page.tsx) にある。
サイトの導線からは外してあるので URL 直打ちで開く。厚み・丸み・背景を
その場で変えられ、メッシュ数と三角形数が左下に出る。

Illustrator の画像トレースから書き出した SVG を足すときの注意。

- **色は `<style>` のクラス指定で入る。** `SVGLoader` はこれを `<style>` 要素の
  CSSOM（`node.sheet.cssRules`）からしか読まない。`DOMParser` が作った文書に
  CSSOM が生えるかは環境依存で、生えなければ**全パスが黒**になる。読み込む前に
  `inlineClassFills()` で `fill` 属性へ展開しているので、この関数を通さずに
  `SVGLoader` を直接呼ばないこと。
- **書き出しは全て自己終了タグ（`<path ... />`）。** 属性を足すときは末尾の `/`
  を必ず取り分けて書き戻す。`/` の後ろに置くと入れ子が崩れ、`transform` を持つ
  SVG（`ContactLogo.svg` は 10 個持つ）は図形が明後日の位置に飛ぶ。
- **1 パス = 1 Mesh にしない。** トレースは同じ色のパスが何十枚もある
  （`RikuLogo` で 118、`ContactLogo` で 644）。色ごとに `mergeGeometries` で
  まとめてからメッシュにする。
- **厚み・丸みは最大辺に対する比率で渡す。** SVG の座標は viewBox 依存で桁が
  揃わないため（`RikuLogo` は 862、`ContactLogo` は 1218）、生の値で渡すと
  ファイルごとに数字を調整し直すことになる。
- **三角形数はファイルによって桁が違う。** 同じ設定でも `RikuLogo` は約 8 万、
  `WorksLogo` は約 51 万、`ContactLogo` は約 68 万。複数枚を同時に出すときは
  `bevel: 0` や `curveSegments` を下げて削る。

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
| `SkillLayerTimeline.tsx` | Skills の重ね積みレイヤー 1 枚ぶんの動き。1 レイヤー = 1 timeline。見出しの退場（`useSkillHeroTimeline`）も同居（フック） | `sections/SkillLayer.tsx` / `sections/SkillHero.tsx` |

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

### Skills の重ね積み（`/skills`）

セクションが張り付いたまま、次のセクションが下から乗り上げてくる作り。
[follow.art](https://follow.art) の `.section` プリミティブを写したもの。

**張り付きと重なりは CSS だけで作っている**（[`styles/SkillStack.module.css`](../styles/SkillStack.module.css)）。
箱を縦に伸ばし、そのうち「次に覆わせたいぶん」だけを負の `margin-bottom` で文書から
引く。伸ばしたぶんが `position: sticky` の張り付き区間になり、引いたぶんに次の
セクションが乗り上げる。`svh` なのでモバイルの URL バー伸縮でも食い違わない。
ヘッダー（`ui/header` の `h-16`）ぶんは `--s-head` で補正するので、「実際に見える
高さ」H = `100svh - --s-head` が単位になる。

GSAP の `pin` を使わないので `pin-spacer` が作られず、ルート遷移で residue が
残らない。重なりの上下は DOM 順（`.section` が `position: relative` なので後ろの
兄弟が上）で決まるので、z-index を振る必要もない。

**`--s-hold`（読ませる区間）が要る理由。** 本家と同じく箱を「H + 覆われる H」だけに
すると、次のセクションは張り付きが始まった瞬間から上がり始めるので、**そのセクションが
完全に見えているのは一瞬だけ**になる。流れる演出としては成立するが、読ませる文章が
あると読めない。そこで「誰にも覆われず、ただ張り付いて待つ」区間を挟む。

| 箱の内訳 | 画面で起きていること |
|---|---|
| H | 下から上がってきて前のレイヤーを覆っていく |
| `hold` × H | 完全に見えている（**読ませる区間**） |
| H | 次のレイヤーが上がってきて覆っていく |

GSAP が持つのは「そのどこで何を見せるか」だけ。
[`gsap/SkillLayerTimeline.tsx`](gsap/SkillLayerTimeline.tsx) が **1 レイヤー = 1 timeline** で
作り、trigger は `start "top bottom"` → `end "bottom bottom"`。区間は
`(2 + hold) × H` になるので、区切りの progress は

```
張り付き開始 = 1 / (2 + hold)
覆われ始め   = (1 + hold) / (2 + hold)
```

で出る（`stopsFor()`）。最後のレイヤーは覆われるぶんが無いので区間が
`(1 + hold) × H`、張り付き開始が `1 / (1 + hold)` で、そこから先は覆われずに終わる
（`isLast`。後退も作らない）。

`hold` の値は **`SkillLayerTimeline` の `HOLD_RATIO` が唯一の持ち主**で、
`StackSection` の `hold` prop 経由で CSS に流し込む。CSS 側に数値を書いて二重に
持たないこと（式が噛み合わなくなると、読ませる区間と timeline の区切りがずれる）。

**`hold` はビューポート幅で 2 つ持つ**（`HOLD_RATIO = { sm: 1.8, md: 1.2 }`）。
写真の切り替えはこの区間の `VARIANT_SPAN` に収まるので、倍率がそのまま「切り替えに
使えるスクロール量」になる。モバイルは指の一振りで大きく動くぶん、同じ倍率だと
切り替えも次のレイヤーへの移行も速すぎるので多めに取る。増やすとページ全長も
1 レイヤーあたり H の差分だけ伸びる。

幅で切り替える仕組みは、**inline style の中ではメディアクエリが書けない**ことから
決まっている。`StackSection` は倍率 2 つ（`--s-hold-sm` / `--s-hold-md`、単位なし）を
流し込むだけで、どちらを使うかは CSS 側（`--s-hold-ratio`）のメディアクエリが選ぶ。
JS 側は `gsap.matchMedia()` を **動きあり × 幅 2 本 + 動きを減らす設定 1 本 =
排他な 3 本**にして、幅ごとに timeline を組み直す（hold が変われば区切りの progress も
変わるため）。境界の 768px だけは `SkillLayerTimeline` の `HOLD_BREAKPOINT` と
`styles/SkillStack.module.css` の `@media` に二重に出る（CSS の `@media` の値を JS から
参照する手段が無い）。JS 側は `max-width: 767.98px` / `min-width: 768px` にして、
小数の幅でも隙間ができないようにしてある。

スキルごとの見せ方（`variant`）は**同じ timeline に載せる**。README の
「1 つのプロパティを複数の ScrollTrigger で触らない」を守るため、レイヤー内で
transform を持つ要素の持ち主を timeline 1 本に寄せている。

| variant | 見せ方 | 尺 |
|---|---|---|
| `flip` | 写真を重ね、backface を隠して順にめくる（下の写真が現れる） | 読ませる区間の `VARIANT_SPAN` |
| `split` | 写真を順に立ち上げ、見出しは `CharReveal` で 1 文字ずつ | 同上 |
| `loop` | 写真を横一列に並べ、スクロール量で横へ流す（自動では流れない） | timeline 全体 |
| `depth` | 写真を段違いに置き、奥のものほど大きく動かす | timeline 全体 |

`flip` / `split` のように**順番に見せるものは読ませる区間の `VARIANT_SPAN`（7 割）で
終わらせる**。区間いっぱいまで使うと、最後の 1 枚が出た直後に次のレイヤーが覆い
始めてしまい、出しただけで見えない。`loop` / `depth` は区切りではなく timeline 全体に
紐づく連続したパララックスなので対象外。

`depth` は**ずらし幅を固定してタイルの大きさを枚数から決める**。逆にすると枚数が
増えたときにずらし幅が足りず、手前の 1 枚が奥を覆い隠す。

セクションの色は `Skill.accent`（6 桁 hex）の 1 か所が持ち、番号のネオンは
`neonStyle()` がそこから組む。`globals.css` の `.neon-*` を 6 色ぶん足すこともできたが、
そうすると「番号の色」と「ヘアライン・発光・背景の数字の色」を別々に持つことになり、
片方だけ変えると食い違う。

レイヤーは**全画面・不透明**。半透明にすると乗り上げるときに前のレイヤーの本文が
透けて二重写しになり、どちらも読めなくなる。上端のヘアラインだけをアクセント色に
していて、それが「前縁」として見える。

**面は transform しない。** 全画面なので縮めると端に隙間が空いて下のレイヤーが
覗いてしまう。GSAP が動かすのは中身（`[data-inner]`）だけで、面（`StackSection` の
stage）は不透明なまま置いておく。

見出しのレイヤー（`sections/SkillHero`）も重ね積みに参加する。最初から見えているので
立ち上がりは要らず、`useSkillHeroTimeline` が退場だけを持つ。これが無いと 1 枚目が
覆いきるまでの間、見出しが residue のように残って見える。`hold` は
`HERO_HOLD_RATIO`（0.4）を持つ — 0 だと開いた直後から 1 枚目が乗り上げ始めてしまう。
**こちらは幅で分けない**（分けると退場の `coverAt` も幅で分岐させることになるが、
見出しは読ませる文章が短いので得るものが少ない）。

以前はここに `webgl/SkillScene3D`（スクロールでロゴへ寄っていく 3D 背景）を敷いて
いたが、レイヤーを全画面・不透明にした時点でほぼ見えなくなったので外した。
戻すなら git 履歴から。

### canvas を 2 枚にする例外（`webgl/splitStage`）

原則は「canvas は 1 枚だけ」（WebGL コンテキストが増えるため）。**`/skills` の見出しだけ
2 枚にしている。** DOM を canvas のあいだに挟まないと「被写体の一部が文字より前、
残りが後ろ」が作れないため。`/skills` には他に canvas が無いので合計 2 で収まる。

`splitStage.ts` がその土台。1 つの Scene と 1 つの PerspectiveCamera を共有し、
`THREE.Layers` で前後を分けて 2 回描く。

```
camera.layers.set(BACK);  backRenderer.render(scene, camera)
camera.layers.set(FRONT); frontRenderer.render(scene, camera)
```

呼び出し側が守ること。

- **2 枚の canvas は完全に同じ箱にする。** 位置・寸法・transform のどれかが食い違うと
  前後の絵が繋がらず段差になる。ラッパーの class を定数で export して共有する
  （`SKILL_INTRO_TILT_CLASS`）
- **手前の canvas には `pointer-events-none`。** 文字やリンクの上に乗るので、
  付け忘れると下が押せなくなる
- 手前に出すものは `mesh.layers.set(LAYER_FRONT)`。既定（0）に置いたものが奥に出る

土台が持つもの: 2 つの renderer（生成は個別に try/catch）、ループ、止める理由の
Set 管理（タブ非表示 / 画面外 / reduced-motion）、resize、dispose。

**縮退**: `front` が無い・作れない場合は全部を back に描く。前後には分かれないが
絵は欠けない。WebGL コンテキスト数に厳しい環境の保険にもなる（`front: null` を
渡して実際に確認済み）。

**`onResize` で大きさを決め直す口がある。** カメラの画角と距離を固定すると
「見える範囲の高さ」は一定だが**幅は aspect 次第**なので、縦長の箱では被写体が
相対的に巨大になる。実際に円柱が視野幅の 87% を占めてモバイルの本文を潰したので、
`visibleWidth` / `visibleHeight` を受けて大きさと位置を比で決めている。

`BackgroundStage` / `NeonParticleStars` / `LogoCarousel3D` も同種のループと停止条件を
それぞれ持っているので、あとから寄せられる（今は寄せていない）。

### 回る円柱（`webgl/SkillIntroStage`）

follow.art のヒーローを参考にしているが、**あちらは前後に分けていない。**
アーカイブの CSS を読むと canvas は 2 枚あるものの、1 枚目（`canvas:first-child`、
`z-index: -1`）は `rotate` の掛かっていない全画面の背景で、35deg 傾いた面は
2 枚目だけ。つまり**傾いた面は丸ごと見出しの前**にある。こちらは前後に分けて
「文字を縫う」ようにしてあるので、そこだけ作りが違う。

Skills の見出しに敷いている、枠なしの写真 6 枚が円柱状に並んで回る面。
follow.art のヒーローと同じ組み方で、**「回転」と「斜め」を別々の層で作る**。

| | どこで |
|---|---|
| 回転 | WebGL。6 枚を Y 軸まわりの円周に置き、Group ごと Y 軸で回す |
| 斜め | canvas を包むラッパーに CSS で `rotate(35deg)`。3D 側は一切傾けない |
| 前後 | `webgl/splitStage`。奥・手前の 2 枚の canvas で見出しを挟む |

円柱の軸は 3D では真っ直ぐ縦。それを画面ごと 35deg 回すので、結果として
「斜めに倒れた円柱が回っている」ように見える。斜め軸まわりの回転
（`rotate3d(1,1,0,…)`）で作ろうとすると角度の制御が難しい。層を分けているのは、
静的な `rotate` と GSAP の transform を同じ要素に書かないため（下の決まりごと参照）。

**登場アニメーションは持たない。** 以前は外側のラッパーを GSAP が
`yPercent: 100 → 0`（`delay: 1` / `duration: 1.5`）で下から入れていたが、開いてから
2.5 秒たつまで面が所定の位置に来ず、その間は下の IntersectionObserver が画面外と
判定して回転も止まっていた。**開いた最初の描画から面があること**を取ったので外した。
戻すなら git 履歴から。

**CSS 3D ではなく WebGL を選んだ理由。** `perspective` + `transform-style: preserve-3d`
でも円柱は作れるが、祖先の `overflow` / `filter` / `opacity` が preserve-3d を潰す。
`SkillHero` の stage は `overflow-hidden` を持っているので CSS だと平面に潰れる。
WebGL は preserve-3d を使わないのでこの衝突が無く、`overflow-hidden` は「回して画面より
大きくした canvas を切り取る」役に回る。

書くときに引っかかった点。

- **ワールドの +X は画面の右ではない。** ラッパーを 35deg 回しているので +X は右下を
  向く。画面上で真横に寄せるには逆回転を掛けた成分で置く
  （`x = r·cosθ − u·sinθ`, `y = r·sinθ + u·cosθ`）。符号を落とすと右ではなく下へ逃げる。
- **カメラを近づけると手前の 1 枚だけ極端に大きくなる。** 距離 7 では手前 577px /
  奥 260px で、手前が画面上端で切れた。引くと遠近差が緩んで輪が収まる。
- **奥に回った写真を出すには、1 か所に背中合わせで 2 枚置く。** 素の 1 枚だけだと
  法線がカメラの逆を向くので `FrontSide` のカリングで消える。`DoubleSide` にすれば
  見えるが、それは裏面＝左右反転で、今の 6 枚（サイトのスクリーンショットや
  サイトマップ）は文字が鏡文字になって崩れる。外向きと内向きの 2 枚を置けば、
  手前でも奥でも「表」を見せられる。カメラを向いていない側はカリングで捨てられるので
  同じ位置に 2 枚あっても z ファイティングは起きない。
- **前後の振り分けは静的に決まる。** 背中合わせの 2 枚のうち、外向きが見えるのは
  円柱の手前にいる間だけ、内向きは奥にいる間だけ（`FrontSide` のカリング）。だから
  外向きを FRONT、内向きを BACK に一度置けば、回転に伴って自動で
  「奥 → 手前 → 奥」と入れ替わる。毎フレームの判定は要らない。
- **奥向きの面は `opacity` を落とす。** 手前と同じ濃さだと重なって絵が混み、
  目次の文字まで読みにくくなる。落とすと「奥にある」ことが濃さで分かる。
  material は写真 1 枚につき 2 つになるので、dispose は作った側で集めた配列を回す
  （メッシュを回すと共有ぶんを二重に捨てる）。
- **canvas に直接 `inset` を当てても箱は広がらない。** canvas は置換要素なので
  `width`/`height` が `auto` だと inset ではなく固有サイズ（300x150）で解決される。
  ラッパーを広げて canvas は `%` で埋める。
- **`renderer.setSize(w, h, false)`。** 第 3 引数を省くと three が canvas に inline style を
  書き、CSS で決めた箱（負の inset）を上書きしてしまう。
- **`new THREE.WebGLRenderer` は WebGL が無いと例外を投げる。** try/catch していないと
  Next のエラー画面でページごと落ちる。落としても見出しは文字と目次だけで読める。
- **material を dispose しても `map` は解放されない。** テクスチャは別に `dispose()` する。
- **テクスチャの読み込みは非同期。** `disposed` フラグで見張らないと unmount 後に
  `scene.add` してしまう。
- 写真は原点に置くと `SkillHero` のスクリムに食われて見えない。画面の右へ逃がし、
  `opacity` を落として敷く。1.0 で出すと見出しと目次が写真に負けて読めない。

回り続けるので rAF を持つ。止める理由は同時に複数立ちうるので、`gsap/MarqueeLoop` と
同じく理由を Set で持ち、ひとつでも残っている間は止め続ける。

| 止める条件 | 手段 |
|---|---|
| タブが非表示 | `visibilitychange`（`BackgroundStage` と同じ） |
| 見出しが画面外 | `IntersectionObserver`。ページは 15 画面ぶん（モバイルでは 18 画面ぶん）あり、覆われた後も回ってしまう |
| 動きを減らす設定 | ループを作らず 1 枚だけ描く |

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
| `TopSection.tsx` | なし。100vh の場所取りのみ（描画は `webgl/BackgroundStage` が担当） |
| `ProjectsIntoro.tsx` | Swiper + `webgl/DistortOverlay`。イントロ演出は `gsap/ProjectsIntroReel` に委譲。送りボタンは自前（下記） |
| `AboutSection.tsx` | IntersectionObserver（歪み演出のみ）。動きは `gsap/HeroBandParallax` / `gsap/CharReveal` / `gsap/StrengthParallax` に委譲 |
| `HobbySection.tsx` | CSS チルト + `ui/CurtainModal` 風のズームモーダル。開閉は `gsap/ZoomFlip` に委譲 |
| `SkillBarsAbout.tsx` | CSS transition + IntersectionObserver |
| `ContactSection.tsx` | GSAP ScrollTrigger（順次点灯）+ `webgl/NeonParticleStars` |
| `WorksSection.tsx` | CSS のみ。`ui/InfiniteMarquee` を使う |
| `SkillLayer.tsx` | Skills の重ね積みレイヤー 1 枚。器は `ui/StackSection`、動きは `gsap/SkillLayerTimeline` に委譲 |
| `SkillHero.tsx` | Skills の先頭の見出しレイヤー。1 枚目が乗り上げる間に引いていく |

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
| `StackSection.tsx` | 張り付いたまま次が乗り上げてくる重ね積みセクションの器。動きは CSS のみ（`styles/SkillStack.module.css`） |

### Swiper の送りボタンは自前のものに置き換えてある

`sections/ProjectsIntoro` は **`swiper/css/navigation` を読んでいない。**
読むと `.swiper-button-*` の既定（`#007aff` / 画面端 10px / `swiper-icons` フォント）が
効いてしまう。素のままだと次の 4 点が問題になる。

- 色 `#007aff` が Swiper 既定のテーマ色で、サイトのパレット（cyan / purple / amber /
  neon white）に無い
- 画面の左右端 10px に張り付き、中央のカードとの関係が読めない
- 字形が `content: "prev" / "next"` を `swiper-icons` で置換する作りなので、
  **フォントの読み込みに失敗すると英単語がそのまま出る**
- `aria-label` が付かない（`a11y` モジュール未導入）

代わりに `<button type="button">` + インライン SVG を自前で置き、
`onBeforeInit` で `prevEl` / `nextEl` に差し込んでいる。

```
navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
onBeforeInit={(swiper) => { /* ここで ref を入れ直す */ }}
```

**`navigation` に `prevRef.current` を渡すだけでは効かない。** ref が埋まるのは
React の commit 後で、Swiper の初期化がそれより先に走ることがあり `null` が入る。
`onBeforeInit` の中で代入し直すのが Swiper React の定石。

見た目は `styles/ProjectsSwiper.module.css` の `.navBtn` / `.navPrev` / `.navNext`。
位置はカードの左右の端に合わせてあり、写真に 44px ぶん重なる。写真の上に乗るので
板は敷かず `drop-shadow` だけで輪郭を確保している。

**モバイルのカード幅 `--max-w` は 80vw に戻した。** 以前 68vw まで下げていたのは、
画面端に居る既定の矢印との隙間が 3〜10px しか残らず「写真に矢印がめり込んで見える」
のを避けるための妥協だった。ボタンをカードの縁へ寄せたのでその制約は無くなった。

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
