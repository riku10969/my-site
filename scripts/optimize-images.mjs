/**
 * public/ の画像を WebP に変換して、src/ の参照も書き換える。
 *
 *   npm run images        ドライラン（何も書き換えない・変換結果と画質だけ表示）
 *   npm run images:apply  実行（webp を書き出し、元ファイルを削除し、src/ の参照を置換）
 *
 * 最大長辺は「実際にページ上で何px で表示されるか」から決めている。
 * 新しいディレクトリを追加したら RULES に足すこと。該当が無ければ DEFAULT が使われる。
 *
 * 注意: public/ は原本の保管場所ではない。元データは別途手元に残しておくこと
 * （このスクリプトは変換後に元ファイルを削除する。git 履歴からは復元可能）。
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const APPLY = process.argv.includes("--apply");

/** 表示サイズの2倍（Retina 相当）を目安にした上限 */
const RULES = {
  works: { max: 2000, q: 88 }, // 詳細モーダルで拡大表示・文字が入るので高品質
  projects: { max: 1800, q: 84 }, // カード＋About ヒーロー（540px 高）
  skill: { max: 1600, q: 82 }, // 50vw / 最大 340px 高
  parallax: { max: 1200, q: 80 }, // デスクトップでも最大 420px 幅
  hobby: { max: 1200, q: 80 }, // 正方形タイル＋520px モーダル
};
const DEFAULT = { max: 1200, q: 90 }; // public 直下（ロゴ／WebGL テクスチャ兼用）

/** 画質評価をサイト背景に合成してから行う。
 *  合成しないと、WebP が完全透明ピクセルの下の RGB を書き換えるせいで
 *  透過画像だけ実際よりはるかに低品質に見えてしまう。 */
const SITE_BG = { r: 0x12, g: 0x13, b: 0x16 };

const RASTER = /\.(png|jpe?g)$/i;

function walk(dir, hit) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, hit) : hit(p);
  }
}

function ruleFor(relFromPublic) {
  const top = relFromPublic.split(path.sep)[0];
  return RULES[top] ?? DEFAULT;
}

async function psnr(bufA, bufB) {
  const toGrey = (b) =>
    sharp(b).flatten({ background: SITE_BG }).greyscale().raw().toBuffer();
  const [a, b] = await Promise.all([toGrey(bufA), toGrey(bufB)]);
  let se = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    se += d * d;
  }
  const rmse = Math.sqrt(se / a.length);
  return 20 * Math.log10(255 / Math.max(rmse, 1e-9));
}

// ---------------------------------------------------------------- 変換
const targets = [];
walk("public", (p) => RASTER.test(p) && targets.push(p));

if (targets.length === 0) {
  console.log("変換対象の png/jpg はありません。public/ はすべて webp です。");
  process.exit(0);
}

const rename = []; // [旧パス(/から), 新パス(/から)]
let before = 0;
let after = 0;
let worst = { db: Infinity, file: "" };

console.log(`${"ファイル".padEnd(36)}${"変換後".padStart(12)}${"KB".padStart(9)}${"PSNR".padStart(9)}`);
console.log("-".repeat(70));

for (const abs of targets.sort()) {
  const rel = path.relative("public", abs);
  const { max, q } = ruleFor(rel);
  const meta = await sharp(abs).metadata();
  const srcBytes = fs.statSync(abs).size;

  const long = Math.max(meta.width ?? 0, meta.height ?? 0);
  const resize =
    long > max
      ? {
          width: meta.width >= meta.height ? max : null,
          height: meta.height > meta.width ? max : null,
          withoutEnlargement: true,
        }
      : null;

  let pipe = sharp(abs);
  if (resize) pipe = pipe.resize(resize);
  const out = await pipe.webp({ quality: q, effort: 6 }).toBuffer();

  const refPipe = resize ? sharp(abs).resize(resize) : sharp(abs);
  const db = await psnr(await refPipe.png().toBuffer(), out);
  if (db < worst.db) worst = { db, file: rel };

  const outMeta = await sharp(out).metadata();
  const flag = db < 35 ? " ← 要確認" : "";
  console.log(
    `${(meta.hasAlpha ? "α" : " ") + rel.slice(0, 35).padEnd(35)}` +
      `${(outMeta.width + "x" + outMeta.height).padStart(12)}` +
      `${(Math.round(srcBytes / 1024) + "→" + Math.round(out.length / 1024)).padStart(9)}` +
      `${db.toFixed(1).padStart(7)}dB${flag}`
  );

  before += srcBytes;
  after += out.length;

  const relPosix = "/" + rel.split(path.sep).join("/");
  rename.push([relPosix, relPosix.replace(RASTER, ".webp")]);

  if (APPLY) {
    fs.writeFileSync(abs.replace(RASTER, ".webp"), out);
    fs.unlinkSync(abs);
  }
}

console.log("-".repeat(70));
console.log(
  `${targets.length} 件:  ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(2)} MB` +
    `  (${Math.round((1 - after / before) * 100)}% 削減)   最低 PSNR ${worst.db.toFixed(1)}dB (${worst.file})`
);
console.log("α = 透過あり / PSNR 40dB以上=ほぼ区別不能, 35dB未満は目視で確認を");

// ------------------------------------------------- src/ の参照を書き換え
if (!APPLY) {
  console.log("\nドライランです。実行するには: npm run images:apply");
  process.exit(0);
}

const sources = [];
walk("src", (p) => /\.(tsx?|css|mjs)$/.test(p) && sources.push(p));

let edits = 0;
for (const file of sources) {
  const orig = fs.readFileSync(file, "utf8");
  let t = orig;

  // 1) フルパス:  "/works/web1.png" → "/works/web1.webp"
  for (const [from, to] of rename) t = t.split(from).join(to);

  // 2) ファイル名だけの文字列比較。
  //    AboutSection は noBorderSlugs / noBorderContainSlugs で basename を
  //    突き合わせているので、ここを直さないと罫線指定が黙って外れる。
  for (const [from, to] of rename) {
    const b = path.basename(from);
    const nb = path.basename(to);
    for (const quote of ['"', "'", "`"]) {
      t = t.split(quote + b + quote).join(quote + nb + quote);
    }
  }

  if (t !== orig) {
    fs.writeFileSync(file, t);
    edits++;
    console.log("  更新: " + file);
  }
}
console.log(`\nsrc/ の ${edits} ファイルを更新しました。`);

// 取りこぼしチェック
const leftovers = [];
for (const file of sources) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/["'`]\/[^"'`\s]*\.(png|jpe?g)["'`]/gi)) {
    leftovers.push(`${file}: ${m[0]}`);
  }
}
if (leftovers.length) {
  console.log("\n!! まだ png/jpg を指している参照が残っています:");
  leftovers.forEach((l) => console.log("   " + l));
} else {
  console.log("src/ に png/jpg への参照は残っていません。");
}
console.log("\n次に: npm run build して、ページを開いて画像が出ることを確認してください。");
