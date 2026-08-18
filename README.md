# my-site

Riku Ohashi のポートフォリオサイト。Next.js（App Router）+ TypeScript + Tailwind CSS に、
GSAP と Three.js のアニメーションを載せている。

## 技術構成

| 領域 | 使っているもの |
|---|---|
| フレームワーク | Next.js 16（App Router / Turbopack） |
| 言語 | TypeScript |
| スタイル | Tailwind CSS v4 + CSS Modules（`src/app/styles/`） |
| アニメーション | GSAP（ScrollTrigger / ページ遷移）、Swiper |
| 3D | Three.js（背景・パーティクル・Skills シーン） |
| ホスティング | Vercel |

## セットアップ

```bash
npm install
npm run dev      # http://localhost:3000
```

## npm scripts

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー（Turbopack） |
| `npm run build` | 本番ビルド |
| `npm run start` | ビルド結果を配信 |
| `npm run lint` | ESLint |
| `npm run images` | 画像最適化のドライラン（`scripts/optimize-images.mjs`） |
| `npm run images:apply` | 画像最適化を実際に適用 |

## 環境変数

`.env.example` をコピーして使う。ローカルで設定しなくても動く。

| 変数 | 必須 | 用途 |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | 任意 | canonical / OG の絶対URLの起点。独自ドメインを明示したいときだけ設定する |

### canonical / OG のURLの決まり方

絶対URLの起点は [`src/app/lib/site.ts`](src/app/lib/site.ts) の `SITE_URL` に一元化してある。
決定は上から順で、最初に見つかった値を使う。

1. **`NEXT_PUBLIC_SITE_URL`** — 明示指定。末尾の `/` は落とし、プロトコルが無ければ `https://` を補う
2. **`VERCEL_PROJECT_PRODUCTION_URL`** — Vercel が本番ドメインを自動で注入する（ホスト名のみ）。
   独自ドメインを Vercel に登録済みならその値が入るので、**通常は何も設定しなくてよい**
3. **`http://localhost:3000`** — ローカル開発用のフォールバック

3 番目をあえて localhost にしているのは、設定漏れのときに `https://example.com` のような
他人のドメインが本番HTMLへ出るのを防ぐため（以前それが起きていた）。
canonical が他ドメインを指すと検索エンジンに自サイトを評価させられないので、
フォールバックには実在する他人のドメインを置かない。

`SITE_URL` は `layout.tsx` の `metadataBase` にも渡しているため、
各ページのメタデータは `alternates.canonical: "/"` のように**相対パスで書けば**絶対URLに解決される。

### Vercel での設定（独自ドメインを使う場合のみ）

Vercel に独自ドメインを登録すれば `VERCEL_PROJECT_PRODUCTION_URL` が自動でその値になるので、
基本は設定不要。あえて上書きしたいときだけ以下を行う。

1. Vercel の Project → **Settings → Environment Variables**
2. Key `NEXT_PUBLIC_SITE_URL` / Value `https://<自分のドメイン>`（末尾 `/` 不要）
3. Environment は **Production** に付ける
   （Preview に本番ドメインを設定すると、プレビューの canonical が本番を指す点に注意）
4. 環境変数はビルド時に埋め込まれるので、**保存後に再デプロイする**

### 確認方法

```bash
npm run build
grep -o '<link rel="canonical"[^>]*>' .next/server/app/project/about.html
grep -o '<meta property="og:url"[^>]*>' .next/server/app/project/about.html
```

## ディレクトリ構成

```
src/app/
├── layout.tsx          共通レイアウト・メタデータ（metadataBase）
├── page.tsx            トップページ
├── skills/             Skills ページ
├── project/[slug]/     about / works / contact（SSG。未定義 slug は 404）
├── lab/                確認用の作業台（導線には出さず URL 直打ちで開く）
├── components/         ← 構成の詳細は components/README.md
├── lib/site.ts         canonical / OG の絶対URLの起点
└── styles/             CSS Modules
```

コンポーネントの分け方（`webgl/` `gsap/` `sections/` `ui/`）と各ファイルの役割は
[`src/app/components/README.md`](src/app/components/README.md) にまとめてある。

### `/project/[slug]` の挙動

- `generateStaticParams` で `about` / `works` / `contact` を事前生成
- `dynamicParams = false`。これを外すと未知の slug が ISR で生成され、
  404 画面がステータス 200（soft 404）で配信されてしまう
- 未定義 slug では canonical / OG を出さず `robots: noindex` を返す

## デプロイ

`main` への push で Vercel が本番デプロイする。
