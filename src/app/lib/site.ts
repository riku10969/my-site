// src/app/lib/site.ts

/**
 * 環境変数から絶対URLの起点を取り出す。
 * 空文字・空白だけの値は「未設定」とみなす（Vercel で変数だけ作って値が空、を弾く）。
 * プロトコルが無い値（Vercel が注入するのはホスト名だけ）には https:// を付ける。
 */
const fromEnv = (raw: string | undefined): string | undefined => {
  const trimmed = raw?.trim().replace(/\/+$/, "");
  if (!trimmed) return undefined;
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
};

/**
 * canonical / OG に使う絶対URLの起点。優先順位は上から。
 *
 * 1. NEXT_PUBLIC_SITE_URL
 *    独自ドメインを明示したいときだけ Vercel の環境変数に設定する。
 * 2. VERCEL_PROJECT_PRODUCTION_URL
 *    Vercel が本番ドメインを自動で注入する（プロトコル無しのホスト名）。
 *    独自ドメインを Vercel に登録済みならその値が入るので、
 *    ドメイン名をコードに書き込む必要は無い。
 * 3. http://localhost:3000
 *    ローカル開発時のフォールバック。example.com のような
 *    他人のドメインを本番HTMLに出さないため、ここは localhost にしておく。
 */
export const SITE_URL: string =
  fromEnv(process.env.NEXT_PUBLIC_SITE_URL) ??
  fromEnv(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  "http://localhost:3000";

/** SITE_URL 起点の絶対URLを作る。path は "/project/about" のように渡す */
export const absoluteUrl = (path: string): string =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
