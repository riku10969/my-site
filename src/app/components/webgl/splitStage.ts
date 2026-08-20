/**
 * splitStage
 *
 * 1 つの Three.js シーンを **2 枚の canvas に前後で振り分けて描く**ための土台。
 * 2 枚のあいだに DOM を挟めるので、「被写体の一部が文字より前、残りが後ろ」を
 * 作れる。`ExtrudedSvg.ts` と同じく React 非依存で、ライフサイクルは呼び出し側が持つ。
 *
 * ---------------------------------------------------------------------------
 * 使い方
 *
 *   stage
 *   ├─ div.tilt  → canvas BACK      奥に置きたいもの
 *   ├─ …DOM（文字など）
 *   └─ div.tilt  → canvas FRONT     手前に置きたいもの（pointer-events-none）
 *
 * **2 枚の canvas は完全に同じ箱でなければならない。** 位置・寸法・transform の
 * どれかが食い違うと前後の絵が繋がらず段差になる。呼び出し側はラッパーの class を
 * 定数で共有すること。
 *
 * ---------------------------------------------------------------------------
 * 描き方
 *
 * Scene と PerspectiveCamera は 1 つ。`THREE.Layers` で前後を分け、
 * `camera.layers.set()` を切り替えて 2 回描く。
 *
 *   camera.layers.set(BACK);  backRenderer.render(scene, camera)
 *   camera.layers.set(FRONT); frontRenderer.render(scene, camera)
 *
 * ---------------------------------------------------------------------------
 * 縮退
 *
 * `front` が渡されない、または WebGL コンテキストを作れなかった場合は
 * **全部を back に描く**。前後には分かれないが絵が消えることはない。
 * WebGL コンテキスト数に厳しい環境（iOS Safari など）の保険にもなる。
 *
 * ---------------------------------------------------------------------------
 * 止める条件
 *
 * 止める理由は同時に複数立ちうる（タブ非表示 + 画面外 など）ので Set で持ち、
 * ひとつでも残っている間は止め続ける（`gsap/MarqueeLoop` と同じ考え方）。
 * 呼び出し側が `setPaused(reason, on)` で足し引きする。
 *
 * `prefers-reduced-motion: reduce` のときはループを作らず、1 枚だけ描く。
 */
import * as THREE from "three";

/** レイヤー番号。0 は three の既定なので、既定に置いたものが back に出る */
export const LAYER_BACK = 0;
export const LAYER_FRONT = 1;

export type SplitStageBuildContext = {
  scene: THREE.Scene;
  /** 手前に出したいものに `obj.layers.set(FRONT)` として使う */
  LAYER_BACK: number;
  LAYER_FRONT: number;
};

export type SplitStageOptions = {
  back: HTMLCanvasElement;
  /** 省略・生成失敗時は全部 back に描く（前後に分けない） */
  front?: HTMLCanvasElement | null;
  camera?: { fov?: number; near?: number; far?: number; z?: number };
  /** devicePixelRatio の上限。回して広げた canvas は塗る面積が増えるので抑える */
  maxDpr?: number;
  /** 被写体を作る。戻り値は後片付け */
  build: (ctx: SplitStageBuildContext) => (() => void) | void;
  /** 毎フレーム進める。dt は秒。渡さなければループを持たない（静止画） */
  update?: (dt: number, scene: THREE.Scene) => void;
  /**
   * 箱の寸法が決まった / 変わったときに呼ばれる。描画の直前。
   *
   * カメラの画角と距離を固定すると「見える範囲の高さ」は一定になるが、
   * **幅は aspect 次第**で変わる。縦長の箱では被写体が相対的に巨大になるので、
   * ここで大きさや位置を決め直す口を用意している。
   */
  onResize?: (
    info: { width: number; height: number; aspect: number; visibleHeight: number; visibleWidth: number },
    scene: THREE.Scene
  ) => void;
  /**
   * 毎フレーム前後を振り分けたいときだけ渡す。
   * 被写体の作りで前後が静的に決まるなら不要（そのほうが安い）。
   */
  assign?: (obj: THREE.Object3D, camera: THREE.PerspectiveCamera) => "front" | "back";
  /** 名前。警告に出す */
  label?: string;
};

export type SplitStage = {
  /** 1 枚描く。テクスチャの読み込み完了時などに呼ぶ */
  render(): void;
  resize(): void;
  /** 止める理由を足し引きする。ひとつでも残っていれば止まる */
  setPaused(reason: string, on: boolean): void;
  dispose(): void;
  /** front を作れたか。呼び出し側が縮退を知りたいとき用 */
  readonly hasFront: boolean;
};

/** WebGL が無い環境ではコンストラクタが例外を投げるので、個別に捕まえる */
function createRenderer(canvas: HTMLCanvasElement, label: string, which: string) {
  try {
    const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    r.outputColorSpace = THREE.SRGBColorSpace;
    return r;
  } catch {
    console.warn(`${label}: ${which} の WebGL コンテキストを作れなかった`);
    return null;
  }
}

export function createSplitStage(o: SplitStageOptions): SplitStage {
  const label = o.label ?? "splitStage";
  const maxDpr = o.maxDpr ?? 1.6;

  const backRenderer = createRenderer(o.back, label, "back");
  const frontRenderer = o.front ? createRenderer(o.front, label, "front") : null;

  // back が作れないと何も描けない。空実装を返して呼び出し側を素通りさせる
  if (!backRenderer) {
    frontRenderer?.dispose();
    return {
      render() {},
      resize() {},
      setPaused() {},
      dispose() {},
      hasFront: false,
    };
  }

  const hasFront = frontRenderer !== null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    o.camera?.fov ?? 45,
    1,
    o.camera?.near ?? 0.1,
    o.camera?.far ?? 100
  );
  camera.position.z = o.camera?.z ?? 10;

  const cleanupBuild =
    o.build({ scene, LAYER_BACK, LAYER_FRONT }) ?? undefined;

  // front が無いときは、手前に振られたものも back に描かないと消えてしまう。
  // カメラに両方のレイヤーを見せることで縮退させる
  const drawBack = () => {
    if (hasFront) camera.layers.set(LAYER_BACK);
    else {
      camera.layers.enableAll();
    }
    backRenderer.render(scene, camera);
  };

  const render = () => {
    if (o.assign) {
      scene.traverse((obj) => {
        if (obj === scene) return;
        obj.layers.set(o.assign!(obj, camera) === "front" ? LAYER_FRONT : LAYER_BACK);
      });
    }
    drawBack();
    if (frontRenderer) {
      camera.layers.set(LAYER_FRONT);
      frontRenderer.render(scene, camera);
    }
  };

  const resize = () => {
    // 箱の大きさは CSS が決めている。clientWidth/Height を見て合わせる
    const w = o.back.clientWidth;
    const h = o.back.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    // 第 3 引数 false = three に canvas の inline style を書かせない
    backRenderer.setPixelRatio(dpr);
    backRenderer.setSize(w, h, false);
    if (frontRenderer) {
      frontRenderer.setPixelRatio(dpr);
      frontRenderer.setSize(w, h, false);
    }
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    // カメラから見える範囲（z = 0 の平面上）。呼び出し側が大きさを決めるのに使う
    const visibleHeight = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    o.onResize?.(
      { width: w, height: h, aspect: w / h, visibleHeight, visibleWidth: visibleHeight * (w / h) },
      scene
    );

    render();
  };

  /* -- ループ ------------------------------------------------------------- */

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clock = new THREE.Clock();
  const pausedBy = new Set<string>();
  let rafId = 0;

  const tick = () => {
    rafId = requestAnimationFrame(tick);
    // 経過時間で進めるので、120Hz でも 60Hz でも同じ速さになる
    o.update?.(clock.getDelta(), scene);
    render();
  };

  const sync = () => {
    const shouldRun = !!o.update && pausedBy.size === 0 && !reduced.matches;
    if (shouldRun && rafId === 0) {
      clock.getDelta(); // 止まっていた間の分を捨てる（再開時に飛ばないように）
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

  reduced.addEventListener("change", sync);

  return {
    render,
    resize,
    setPaused,
    hasFront,
    dispose() {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      rafId = 0;
      reduced.removeEventListener("change", sync);
      cleanupBuild?.();
      backRenderer.dispose();
      frontRenderer?.dispose();
    },
  };
}
