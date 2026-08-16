import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * SVG のパスを押し出して 3D の塊にする。React には依存しないので、
 * 呼び出し側は好きなシーンに `scene.add()` するだけでよい。
 *
 * Illustrator の画像トレースで書き出した SVG は「同じ色のパスが何十枚もある」
 * 状態になる。1 パス = 1 Mesh にすると RikuLogo で 118、project3 で 622 の
 * ドローコールになるので、色ごとに 1 つへ統合してから Mesh にしている。
 *
 * 厚み・ベベルの指定は「最大辺に対する比率」で受け取る。SVG の座標は viewBox
 * 依存（RikuLogo は 862、project3 は 1218）で桁が揃わないため、生の値で渡すと
 * ファイルごとに数字を調整し直すことになる。
 */

/**
 * `<style>` の `.st0 { fill: #xxx }` を `fill` 属性へ展開する。
 *
 * SVGLoader は色を `<style>` 要素の `node.sheet.cssRules`（CSSOM）から読む。
 * これは DOMParser が作った文書に CSSOM が生えるかどうかという環境依存の話で、
 * 生えなければ全パスが黒（既定色）になる。Illustrator の書き出しは必ずこの
 * クラス形式なので、読み込む前に自前で属性へ落として環境差を無くしている。
 *
 * 優先順位は SVG の仕様どおり `style="fill:..."` > クラス > `fill` 属性。
 * インラインの style を持つ要素には触らない。
 */
export function inlineClassFills(svgText: string): string {
  // .st0 { ... fill: #xxx ... } を集める。同じクラスが複数回出たら後ろが勝つ
  const fills = new Map<string, string>();
  const styleBlocks = svgText.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) ?? [];
  for (const block of styleBlocks) {
    const ruleRe = /\.([A-Za-z_][\w-]*)\s*\{([^}]*)\}/g;
    let rule: RegExpExecArray | null;
    while ((rule = ruleRe.exec(block)) !== null) {
      const fill = /(?:^|;)\s*fill\s*:\s*([^;]+)/i.exec(rule[2]);
      if (fill) fills.set(rule[1], fill[1].trim());
    }
  }
  if (fills.size === 0) return svgText;

  // 末尾の `/` は必ず取り分けて書き戻す。Illustrator の書き出しは全て自己終了タグ
  // （`<path ... />`）なので、`/` の後ろに属性を足すと入れ子が崩れ、`transform` を
  // 持つ SVG では図形の位置が飛ぶ
  return svgText.replace(
    /<(path|polygon|polyline|rect|circle|ellipse|g)\b([^>]*?)(\/?)>/gi,
    (tag, name, attrs, selfClose) => {
      if (/\sstyle\s*=\s*"[^"]*fill\s*:/i.test(attrs)) return tag; // インライン style が最優先
      const cls = /\sclass\s*=\s*"([^"]*)"/i.exec(attrs);
      if (!cls) return tag;

      // 複数クラスが付いていたら、塗りを定義している最後のものを採用する
      let fill: string | undefined;
      for (const c of cls[1].trim().split(/\s+/)) {
        const f = fills.get(c);
        if (f) fill = f;
      }
      if (!fill) return tag;

      const cleaned = attrs.replace(/\sfill\s*=\s*"[^"]*"/i, "");
      return `<${name}${cleaned} fill="${fill}"${selfClose}>`;
    }
  );
}

export type ExtrudedSvgTune = {
  /** この色だけ厚みを変える（1 が既定の depth） */
  depthScale?: number;
  /** この色だけ前後にずらす。同じ場所に重なったパスの z ファイティング避け */
  z?: number;
};

export type ExtrudedSvgOptions = {
  /** 押し出しの厚み。最大辺に対する比率（0.12 なら「幅の 12%」） */
  depth?: number;
  /** 角の丸め。最大辺に対する比率 */
  bevel?: number;
  bevelSegments?: number;
  /** 曲線の分割数。上げると滑らかになるが頂点数が増える */
  curveSegments?: number;
  /** 出来上がりの最大辺をこの長さに揃える。中心も原点に合わせる */
  fitTo?: number;
  /** 色（6 桁小文字 hex、# なし）ごとの調整 */
  tune?: Record<string, ExtrudedSvgTune>;
  /** 差し替えたいときだけ渡す。既定は MeshStandardMaterial */
  makeMaterial?: (color: THREE.Color, hex: string) => THREE.Material;
};

const defaultMaterial = (color: THREE.Color) =>
  new THREE.MeshStandardMaterial({
    color,
    metalness: 0.2,
    roughness: 0.45,
    // SVG は Y が下向きなので親を scale.y = -1 で反転させる。
    // 面の裏表がひっくり返るため、両面を描く必要がある
    side: THREE.DoubleSide,
  });

export async function loadExtrudedSvg(
  url: string,
  options: ExtrudedSvgOptions = {}
): Promise<THREE.Group> {
  const {
    depth = 0.12,
    bevel = 0.004,
    bevelSegments = 2,
    curveSegments = 8,
    fitTo = 1,
    tune = {},
    makeMaterial = defaultMaterial,
  } = options;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`SVG が読めない (${res.status}): ${url}`);
  const data = new SVGLoader().parse(inlineClassFills(await res.text()));

  // --- 1 パス目: シェイプを作り、SVG 座標系での大きさを測る ---
  const entries: { hex: string; shape: THREE.Shape }[] = [];
  const bounds = new THREE.Box2();
  for (const path of data.paths) {
    // stroke だけのパスは style.fill が "none"。押し出す面が無いので飛ばす
    if (path.userData?.style?.fill === "none") continue;

    const hex = path.color.getHexString();
    for (const shape of SVGLoader.createShapes(path)) {
      entries.push({ hex, shape });
      for (const p of shape.getPoints(curveSegments)) bounds.expandByPoint(p);
    }
  }
  if (entries.length === 0) throw new Error(`塗りのあるパスが無い: ${url}`);

  const size = bounds.getSize(new THREE.Vector2());
  const unit = Math.max(size.x, size.y); // 比率指定の基準になる長さ

  // --- 2 パス目: 押し出して色ごとにまとめる ---
  const byColor = new Map<string, THREE.ExtrudeGeometry[]>();
  for (const { hex, shape } of entries) {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: depth * unit * (tune[hex]?.depthScale ?? 1),
      bevelEnabled: bevel > 0,
      bevelSize: bevel * unit,
      bevelThickness: bevel * unit,
      bevelSegments,
      curveSegments,
    });
    const list = byColor.get(hex);
    if (list) list.push(geo);
    else byColor.set(hex, [geo]);
  }

  const inner = new THREE.Group();
  for (const [hex, geos] of byColor) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue; // 属性が揃わず統合できなかった色は捨てる（起きない想定）

    const mesh = new THREE.Mesh(merged, makeMaterial(new THREE.Color(`#${hex}`), hex));
    mesh.position.z = (tune[hex]?.z ?? 0) * unit;
    mesh.name = hex;
    inner.add(mesh);
  }

  // --- Y 反転（SVG は Y が下向き）と、大きさ・位置の正規化 ---
  const group = new THREE.Group();
  inner.scale.y = -1;
  group.add(inner);

  const scale = fitTo / unit;
  group.scale.setScalar(scale);

  // group の scale をかけた後のワールド中心を測り、その分だけ inner をずらす。
  // inner のローカル位置は group の scale だけを通るので、center / scale でよい
  const center = new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3());
  inner.position.copy(center.divideScalar(-scale));

  group.name = "extruded-svg";
  return group;
}

/** シーンから外すときに呼ぶ。ジオメトリとマテリアルを解放する */
export function disposeExtrudedSvg(group: THREE.Group) {
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat.dispose();
  });
}
