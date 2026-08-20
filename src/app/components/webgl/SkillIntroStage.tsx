/**
 * SkillIntroStage
 *
 * /skills の見出しに敷く、枠なしの写真が円柱状に並んで回る面。
 * `sections/SkillHero` から呼ばれる。
 *
 * ---------------------------------------------------------------------------
 * 「斜め」と「回転」を別の層で作る
 *
 *   回転 … ここ（WebGL）。6 枚を Y 軸まわりの円周に並べ、Group ごと Y 軸で回す
 *   斜め … canvas を包むラッパーに CSS で rotate(35deg)。3D 側は一切傾けない
 *
 * 円柱の軸は 3D では真っ直ぐ縦。それを画面ごと 35deg 回すので、結果として
 * 「斜めに倒れた円柱が回っている」ように見える。斜め軸まわりの回転
 * （rotate3d(1,1,0,…)）で作ろうとすると角度の制御が難しい。
 *
 * 層を分けているのは、静的な rotate と GSAP の transform を同じ要素に
 * 書かないため（README の決まりごと）。今は GSAP がこの面を触らない
 * （**登場アニメーションは持たず、開いた最初の描画から所定の位置にある**）が、
 * 何かを動かすときも canvas とラッパーではなく、さらに外側の要素を動かす。
 *
 * ---------------------------------------------------------------------------
 * 手前の写真は文字より前、奥の写真は文字より後ろ
 *
 * canvas を 2 枚（奥・手前）に分け、そのあいだに見出しの DOM を挟む。
 * 前後の振り分けは `webgl/splitStage` が持つ。
 *
 * **振り分けは静的に決まる。** 1 か所に背中合わせで 2 枚のメッシュを置いてあり、
 *
 *   外向き（法線が円の外）… 円柱の手前に来たときだけカメラを向く → FRONT
 *   内向き（法線が円の内）… 奥に回ったときだけカメラを向く       → BACK
 *
 * `FrontSide` のカリングでカメラを向いていない側は描かれないので、レイヤーを
 * 一度決めれば毎フレームの判定は要らない。回転に伴って自動で
 * 「奥 → 手前 → 奥」と入れ替わる。
 *
 * ---------------------------------------------------------------------------
 * CSS 3D ではなく WebGL の理由
 *
 * perspective + transform-style: preserve-3d でも円柱は作れるが、祖先の
 * overflow / filter / opacity が preserve-3d を潰す。`SkillHero` の stage は
 * overflow-hidden を持っているので CSS だと平面に潰れる。WebGL は preserve-3d を
 * 使わないのでこの衝突が無く、overflow-hidden は「回して画面より大きくした canvas を
 * 切り取る」役に回る。
 *
 * canvas の箱は CSS が決める（inset を負にして広げ、ラッパーを rotate で回す）ので、
 * `splitStage` 側が `setSize` の第 3 引数を false にして three に inline style を
 * 書かせない。
 */
"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { createSplitStage } from "./splitStage";

/**
 * 2 枚の canvas を包むラッパーの class。
 *
 * **奥と手前で必ず同じものを使うこと。** 位置・寸法・transform が食い違うと
 * 前後の絵が繋がらず段差になる。だから定数にして共有している。
 *
 * canvas に直接 inset を当ててはいけない。canvas は置換要素なので width/height が
 * auto だと inset ではなく固有サイズ（300x150）で解決され、箱が広がらない。
 * ラッパーを広げて canvas は % で埋める。
 */
export const SKILL_INTRO_TILT_CLASS =
  "pointer-events-none absolute inset-[-12%] rotate-[35deg]";

/** canvas 自身の class。こちらも 2 枚で共有する */
export const SKILL_INTRO_CANVAS_CLASS = "block h-full w-full";

/** 既存の写真を使い回す。人物写真は使わない */
const IMAGES = [
  "/skill/branding1.webp",
  "/skill/design2.webp",
  "/skill/design3.webp",
  "/skill/frontend2.webp",
  "/parallax/site.webp",
  "/parallax/coding.webp",
];

/** 面 1 枚の大きさ。テクスチャは UV でこの比率に cover させる */
const PLANE_W = 1.7;
const PLANE_H = 1.08;
const PLANE_ASPECT = PLANE_W / PLANE_H;

/**
 * 円柱の半径。円周（2πR）が 枚数 × 面の幅 より十分大きくないと隣とぶつかる。
 * 6 枚 × 1.7 = 10.2 に対して 2π × 1.95 ≒ 12.3 なので、間に隙間が空く。
 */
const CYL_RADIUS = 1.95;
/** 円柱をわずかに手前へ倒して、上面が見えるようにする（rad） */
const CYL_TILT_X = -0.11;

/**
 * 円柱を画面のどこへ寄せるか。**視野に対する比**で持つ。
 *
 * カメラの画角と距離を固定すると「見える範囲の高さ」は一定だが、**幅は aspect
 * 次第**で変わる。ワールドの絶対値で置くと、縦長のモバイルでは円柱が視野幅の
 * 87% を占めて説明文を潰した。比で持てば画面の形が変わっても収まりが保たれる。
 *
 * ただしラッパーを 35deg 回してあるので、**ワールドの +X は画面の右ではない**
 * （右下を向く）。画面上で真横・真上に動かすには、その回転の逆を掛けた成分で置く。
 *
 *   画面の (右 r, 上 u) に動かしたい
 *   → canvas 上のずれ (dx, dy) = R(-35deg) · (r, -u)     ※ 画面の y は下向き
 *   → three は y が上向きなので  x = dx,  y = -dy
 *
 *   まとめると  x = r·cosθ - u·sinθ ,  y = r·sinθ + u·cosθ
 *
 * 符号を落とすと右ではなく下へ逃げる（実際に一度そうなった）。
 */
/**
 * 寄せ方は画面の形で変える。横長（デスクトップ）と縦長（モバイル）で
 * 文字の置かれ方が違うため。
 *
 * 横長では見出しが左から伸びるので、右へ寄せすぎると**文字に一度も重ならず**、
 * 「隙間を縫う」動きが出ない（0.18 だと円柱の中心が文字の右外に出ていた）。
 * 中心を文字の帯へ寄せ、説明文（左半分・幅の狭い塊）は避ける。
 *
 * 縦長では説明文が幅いっぱいに 3 行流れるので、円柱を下に置くと本文を潰す。
 * 見出しの帯まで上げて、そこで「文字を縫う」役に集中させる。
 */
const CYL_LAYOUT_WIDE = { right: 0.0, up: 0.22 }; // aspect 1.7 あたり
const CYL_LAYOUT_TALL = { right: 0.24, up: 0.34 }; // aspect 0.55 あたり
const ASPECT_WIDE = 1.7;
const ASPECT_TALL = 0.55;
const TILT_RAD = (35 * Math.PI) / 180;

/**
 * 基準になる視野の幅（デスクトップ 1440x900 でのおおよその値）。
 * これより狭い視野では円柱を縮める。
 */
const REFERENCE_VISIBLE_WIDTH = 14.25;
/** 縮め方の緩さ。1 なら比例、小さいほど緩やか */
const SCALE_EXPONENT = 0.6;
/** 縮めすぎて見えなくならないための下限 */
const MIN_SCALE = 0.42;

/**
 * 視野の広さから円柱の大きさと位置を決める。`splitStage` の onResize から呼ぶ。
 */
function layoutCylinder(
  group: THREE.Group,
  visibleWidth: number,
  visibleHeight: number,
  aspect: number
) {
  const k = Math.max(
    MIN_SCALE,
    Math.min(1, Math.pow(visibleWidth / REFERENCE_VISIBLE_WIDTH, SCALE_EXPONENT))
  );
  group.scale.setScalar(k);

  // 横長 ↔ 縦長のあいだを補間する。段差で切り替えると回転中の端末で跳ねる
  const t = THREE.MathUtils.clamp(
    (aspect - ASPECT_TALL) / (ASPECT_WIDE - ASPECT_TALL),
    0,
    1
  );
  const right =
    visibleWidth * THREE.MathUtils.lerp(CYL_LAYOUT_TALL.right, CYL_LAYOUT_WIDE.right, t);
  const up =
    visibleHeight * THREE.MathUtils.lerp(CYL_LAYOUT_TALL.up, CYL_LAYOUT_WIDE.up, t);
  group.position.set(
    right * Math.cos(TILT_RAD) - up * Math.sin(TILT_RAD),
    right * Math.sin(TILT_RAD) + up * Math.cos(TILT_RAD),
    0
  );
}

/** 1 周にかける秒数 */
const REVOLUTION_SECONDS = 38;

/**
 * 手前に来た面の不透明度。文字より前に出るので、ここが写真の存在感を決める。
 *
 * 奥（PLANE_OPACITY_BACK）との差が小さいと、写真そのものの明暗のほうが勝ってしまい
 * 「奥のほうが存在感がある」と見える。実際 .85 / .45 では、たまたま明るい写真が
 * 奥に回っているときに逆転して見えた。差をはっきり付ける。
 */
const PLANE_OPACITY = 0.95;

/**
 * 奥に回った面の不透明度。手前との差で「奥にある」ことを見せる。
 * 手前と近い値にすると、明るい写真が奥に来たときに前後が逆に見える。
 */
const PLANE_OPACITY_BACK = 0.26;

const FOV = 45;
/**
 * カメラの距離。近いと手前の 1 枚だけ極端に大きくなって画面から溢れる
 * （7 だと手前が 577px・奥が 260px で、手前が上端で切れた）。
 * 引くと遠近差が緩んで輪が収まる。
 */
const CAMERA_Z = 10;
/**
 * devicePixelRatio の上限。
 *
 * canvas は回して広げてあるうえに**前後で 2 枚**あるので、塗る面積が効く。
 * 1.6 だと 1440x780 の画面で 1 枚 3.4M px（2 枚で 6.8M）になり、画面の 5 倍以上を
 * 塗ることになる。中身は不透明度を落とした写真なので、少し甘くなっても分からない。
 */
const MAX_DPR = 1.25;

/**
 * テクスチャを面の比率に cover させる（object-fit: cover の UV 版）。
 * 平面の頂点をいじらないので、面の大きさを揃えたままはみ出しぶんだけ切れる。
 */
function coverTexture(tex: THREE.Texture) {
  const img = tex.image as { width: number; height: number } | undefined;
  if (!img?.width || !img?.height) return;
  const imgAspect = img.width / img.height;
  if (imgAspect > PLANE_ASPECT) {
    // 画像のほうが横長 → 左右を切る
    const r = PLANE_ASPECT / imgAspect;
    tex.repeat.set(r, 1);
    tex.offset.set((1 - r) / 2, 0);
  } else {
    const r = imgAspect / PLANE_ASPECT;
    tex.repeat.set(1, r);
    tex.offset.set(0, (1 - r) / 2);
  }
}

export function useSkillIntroStage(
  backRef: React.RefObject<HTMLCanvasElement | null>,
  frontRef: React.RefObject<HTMLCanvasElement | null>
) {
  useEffect(() => {
    const back = backRef.current;
    if (!back) return;

    // テクスチャの読み込みは非同期なので、片付いた後に scene へ足さないよう見張る
    let disposed = false;
    let cylinder: THREE.Group | null = null;

    const stage = createSplitStage({
      label: "SkillIntroStage",
      back,
      front: frontRef.current,
      camera: { fov: FOV, z: CAMERA_Z },
      maxDpr: MAX_DPR,

      build: ({ scene, LAYER_BACK, LAYER_FRONT }) => {
        // 円柱そのもの。これを Y 軸で回す
        const group = new THREE.Group();
        group.rotation.x = CYL_TILT_X;
        // 大きさと位置は視野の広さから決まるので onResize が入れる
        // Group 自身は描かれないが、レイヤーは子に継承されないので子ごとに設定する
        scene.add(group);
        cylinder = group;

        const materials: THREE.Material[] = [];
        const textures: THREE.Texture[] = [];
        const geometry = new THREE.PlaneGeometry(PLANE_W, PLANE_H);
        const loader = new THREE.TextureLoader();

        IMAGES.forEach((src, i) => {
          // 円周上に等間隔で置く
          const angle = (i / IMAGES.length) * Math.PI * 2;

          loader.load(
            src,
            (tex) => {
              if (disposed) {
                tex.dispose();
                return;
              }
              tex.colorSpace = THREE.SRGBColorSpace;
              coverTexture(tex);
              textures.push(tex);

              const x = Math.sin(angle) * CYL_RADIUS;
              const z = Math.cos(angle) * CYL_RADIUS;

              /*
               * 1 か所に**背中合わせで 2 枚**置く。外向き（法線を円の外へ）と内向き
               * （円の内へ）で、円柱の手前ではこちらが、奥では向こうがカメラを向く。
               * どちらも「表」を見せるので、奥に回った写真も鏡文字にならない。
               *
               * side を DoubleSide にする手もあるが、それだと奥の写真は裏面が見える＝
               * 左右反転になる。今の 6 枚はサイトのスクリーンショットやサイトマップで
               * 文字が入っているので、鏡文字だと崩れて見える。
               *
               * カメラを向いていない側は FrontSide の面カリングで捨てられるので、
               * 同じ位置に 2 枚あっても z ファイティングは起きない。
               *
               * レイヤーはここで決めれば済む（毎フレームの判定が不要）。外向きが
               * 見えるのは手前にいる間だけなので FRONT、内向きは奥にいる間だけなので
               * BACK に置く。
               */
              for (const [facing, opacity, layer] of [
                [0, PLANE_OPACITY, LAYER_FRONT], // 外向き = 手前に来たときに見える
                [Math.PI, PLANE_OPACITY_BACK, LAYER_BACK], // 内向き = 奥に回ったときに見える
              ] as const) {
                // ライト不要。Lambert だとライトの管理と発色ズレが付いてくる。
                // 手前向きと奥向きで濃さが違うので material は 2 つ作る
                const material = new THREE.MeshBasicMaterial({
                  map: tex,
                  transparent: true,
                  opacity,
                });
                materials.push(material);

                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(x, 0, z);
                mesh.rotation.y = angle + facing;
                mesh.layers.set(layer);
                group.add(mesh);
              }
              stage.render();
            },
            undefined,
            () => console.warn("SkillIntroStage: 画像を読めなかった:", src)
          );
        });

        return () => {
          // material は写真 1 枚につき 2 つ（手前向き・奥向きで濃さが違う）。
          // メッシュを回すと共有ぶんを二重に捨てるので、作った側で積んだ配列を回す
          materials.forEach((m) => m.dispose());
          // material を dispose しても map は解放されないので、テクスチャは別に捨てる
          textures.forEach((t) => t.dispose());
          geometry.dispose();
        };
      },

      update: (dt) => {
        if (cylinder) cylinder.rotation.y += (dt / REVOLUTION_SECONDS) * Math.PI * 2;
      },

      onResize: ({ visibleWidth, visibleHeight, aspect }) => {
        if (cylinder) layoutCylinder(cylinder, visibleWidth, visibleHeight, aspect);
      },
    });

    stage.resize();

    /* -- 止める条件 --------------------------------------------------------- */

    const onVisibility = () => stage.setPaused("hidden", document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    // 見出しが画面から出たら止める。ページは 15 画面ぶん（モバイルでは 18 画面ぶん）
    // あり、覆われた後も回り続けてしまう
    const io = new IntersectionObserver(
      ([entry]) => stage.setPaused("offscreen", !entry.isIntersecting),
      { threshold: 0 }
    );
    io.observe(back);

    const ro = new ResizeObserver(() => stage.resize());
    ro.observe(back);
    window.addEventListener("resize", stage.resize);

    stage.setPaused("hidden", document.hidden);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", stage.resize);
      stage.dispose();
    };
  }, [backRef, frontRef]);
}
