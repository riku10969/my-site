/**
 * SkillIntroStage
 *
 * /skills の見出しに敷く、枠なしの写真が円柱状に並んで回る面。
 * `sections/SkillHero` から呼ばれる。follow.art のヒーローと同じ組み方。
 *
 * ---------------------------------------------------------------------------
 * 「斜め」と「回転」を別の層で作る
 *
 *   回転 … ここ（WebGL）。6 枚を Y 軸まわりの円周に並べ、Group ごと Y 軸で回す
 *   斜め … canvas を包むラッパーに CSS で rotate(35deg)。3D 側は一切傾けない
 *   登場 … さらに外側のラッパーを GSAP が動かす（gsap/SkillLayerTimeline）
 *
 * 円柱の軸は 3D では真っ直ぐ縦。それを画面ごと 35deg 回すので、結果として
 * 「斜めに倒れた円柱が回っている」ように見える。斜め軸まわりの回転
 * （rotate3d(1,1,0,…)）で作ろうとすると角度の制御が難しい。
 *
 * 3 層に分けているのは、静的な rotate と GSAP の transform を同じ要素に
 * 書かないため（README の決まりごと）。
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
 * ---------------------------------------------------------------------------
 * 描画ループ
 *
 * 円柱が回り続けるので rAF を回す。ただし回し続けるのは無駄なので
 *   - タブが非表示（document.hidden）の間は止める（BackgroundStage と同じ）
 *   - 見出しが画面から出たら止める（ページは 10 画面ぶんあり、覆われた後も
 *     回り続けてしまう）
 *   - prefers-reduced-motion: reduce ではループを回さず 1 枚だけ描く
 *
 * canvas の箱は CSS が決める（inset を負にして広げ、ラッパーを rotate で回す）ので、
 * `setSize` の第 3 引数を false にして three に inline style を書かせない。
 */
"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

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
 * 6 枚 × 1.7 = 10.2 に対して 2π × 2.2 ≒ 13.8 なので、間に隙間が空く。
 */
const CYL_RADIUS = 2.2;
/** 円柱をわずかに手前へ倒して、上面が見えるようにする（rad） */
const CYL_TILT_X = -0.11;

/**
 * 円柱を画面のどこへ寄せるか（画面上の右・上、ワールド単位）。
 *
 * 見出しの文字は左にあり、`SkillHero` のスクリムも左が濃い。原点に置くとちょうど
 * スクリムに食われて見えないので、画面の右へ逃がす。
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
const CYL_SCREEN_RIGHT = 1.9;
const CYL_SCREEN_UP = 0.45;
const TILT_RAD = (35 * Math.PI) / 180;
const CYL_OFFSET_X =
  CYL_SCREEN_RIGHT * Math.cos(TILT_RAD) - CYL_SCREEN_UP * Math.sin(TILT_RAD);
const CYL_OFFSET_Y =
  CYL_SCREEN_RIGHT * Math.sin(TILT_RAD) + CYL_SCREEN_UP * Math.cos(TILT_RAD);
/** 1 周にかける秒数 */
const REVOLUTION_SECONDS = 38;

/**
 * 面の不透明度。見出しは文字が主役なので写真は背景として引く。
 * 1.0 で出すと「Skill」と目次が写真に負けて読めなくなる。
 */
const PLANE_OPACITY = 0.62;

/**
 * 奥向き（円の内側を向く）の面の不透明度。円柱の奥に回ったときに見えるのがこれ。
 *
 * 手前と同じ濃さで出すと、手前の面と重なって絵が混み、目次の文字まで読みにくくなる。
 * 落としておくと「奥にある」ことが濃さで分かり、重なりも軽くなる。
 */
const PLANE_OPACITY_BACK = 0.3;

const FOV = 45;
/**
 * カメラの距離。近いと手前の 1 枚だけ極端に大きくなって画面から溢れる
 * （7 だと手前が 577px・奥が 260px で、手前が上端で切れた）。
 * 引くと遠近差が緩んで輪が収まる。
 */
const CAMERA_Z = 10;
/** 回して広げたぶん余分にピクセルを描くので、上限を 1.6 に抑える（BackgroundStage と同じ） */
const MAX_DPR = 1.6;

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

export default function SkillIntroStage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // WebGL が使えない環境ではコンストラクタが例外を投げる。
    // 見出しは文字と目次だけで成立するので、黙って canvas を出さないでおく
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      console.warn("SkillIntroStage: WebGL が使えないので面は出さない");
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    camera.position.z = CAMERA_Z;

    // 円柱そのもの。これを Y 軸で回す
    const cylinder = new THREE.Group();
    cylinder.rotation.x = CYL_TILT_X;
    cylinder.position.set(CYL_OFFSET_X, CYL_OFFSET_Y, 0);
    scene.add(cylinder);

    const render = () => renderer.render(scene, camera);

    const resize = () => {
      // 箱の大きさは CSS が決めている。clientWidth/Height を見て合わせる
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
      // 第 3 引数 false = three に canvas の inline style を書かせない
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    };

    // テクスチャの読み込みは非同期なので、片付いた後に scene へ足さないよう見張る
    let disposed = false;
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];
    const loader = new THREE.TextureLoader();
    const geometry = new THREE.PlaneGeometry(PLANE_W, PLANE_H);

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

          // ライト不要。Lambert だとライトの管理と発色ズレが付いてくる。
          // 手前向きと奥向きで濃さが違うので material は 2 つ作る
          const makeMaterial = (opacity: number) => {
            const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity });
            materials.push(m);
            return m;
          };

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
           */
          for (const [facing, opacity] of [
            [0, PLANE_OPACITY], // 外向き = 円柱の手前に来たときに見える
            [Math.PI, PLANE_OPACITY_BACK], // 内向き = 奥に回ったときに見える
          ] as const) {
            const mesh = new THREE.Mesh(geometry, makeMaterial(opacity));
            mesh.position.set(x, 0, z);
            mesh.rotation.y = angle + facing;
            cylinder.add(mesh);
          }
          render();
        },
        undefined,
        () => console.warn("SkillIntroStage: 画像を読めなかった:", src)
      );
    });

    resize();

    /* -- 回転 ------------------------------------------------------------- */

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const clock = new THREE.Clock();
    let rafId = 0;
    // 止める理由は同時に複数立ちうる（タブ非表示 + 画面外 など）。
    // ひとつでも残っている間は止め続ける（gsap/MarqueeLoop と同じ考え方）
    const pausedBy = new Set<string>();

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      // 経過時間で進めるので、120Hz でも 60Hz でも同じ速さになる
      cylinder.rotation.y += (clock.getDelta() / REVOLUTION_SECONDS) * Math.PI * 2;
      render();
    };

    const sync = () => {
      const shouldRun = pausedBy.size === 0 && !reduced.matches;
      if (shouldRun && rafId === 0) {
        clock.getDelta(); // 止まっていた間の分をここで捨てる（再開時に飛ばないように）
        tick();
      } else if (!shouldRun && rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const setPaused = (reason: string, on: boolean) => {
      if (on) pausedBy.add(reason);
      else pausedBy.delete(reason);
      sync();
    };

    const onVisibility = () => setPaused("hidden", document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    // 見出しが画面から出たら止める
    const io = new IntersectionObserver(
      ([entry]) => setPaused("offscreen", !entry.isIntersecting),
      { threshold: 0 }
    );
    io.observe(canvas);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener("resize", resize);
    reduced.addEventListener("change", sync);

    setPaused("hidden", document.hidden);

    return () => {
      disposed = true;
      if (rafId !== 0) cancelAnimationFrame(rafId);
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", sync);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", resize);
      // material は写真 1 枚につき 2 つ（手前向き・奥向きで濃さが違う）。
      // 作った側で materials に積んであるので、ここはそれを回すだけでよい
      materials.forEach((m) => m.dispose());
      // material を dispose しても map は解放されないので、テクスチャは別に捨てる
      textures.forEach((t) => t.dispose());
      geometry.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    /*
     * 斜めと箱の拡張はこのラッパーが持つ。35deg 回すと角が欠けるので inset を負にして
     * 広げ、はみ出したぶんは stage の overflow-hidden が切る。
     * GSAP はここも canvas も触らない（触る対象はさらに外側、SkillHero 側のラッパー）。
     *
     * canvas に直接 inset を当ててはいけない。canvas は置換要素なので width/height が
     * auto だと inset ではなく固有サイズ（300x150）で解決され、箱が広がらない。
     * ラッパーを広げて canvas は % で埋める。
     */
    <div className="absolute inset-[-28%] rotate-[35deg]">
      <canvas ref={canvasRef} className="block h-full w-full" aria-hidden />
    </div>
  );
}
