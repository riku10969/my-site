"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type ImagePlaneHandle = {
  update(): boolean;
  dispose(): void;
};

type Props = {
  /** 歪ませたい <img> のセレクタ（例: 'img[data-distort]'） */
  selector?: string;
  /** 歪みの全体倍率（0.2〜0.8推奨） */
  strength?: number;
  /** アニメ進行速度（0.5〜1.0推奨） */
  speed?: number;
  /** 1フレームの最大歪み（px） */
  maxAmpPx?: number;
  /** 無視する最小移動量（px） */
  deadZonePx?: number;
  /** 減衰（0〜1）。大きいほどゆっくり追従 */
  damping?: number;
  /** 何フレームごとに対象<img>を再スキャンするか（DOM差し替え対応） */
  rescanIntervalFrames?: number;
};


export default function DistortOverlay({
  selector = 'img[data-distort]',
  strength = 0.40,
  speed = 0.65,
  maxAmpPx = 10,
  deadZonePx = 1.2,
  damping = 0.92,
  rescanIntervalFrames = 20,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // three refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef   = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef    = useRef<THREE.Scene | null>(null);

  // animation state
  const rafRef      = useRef<number | null>(null);
  const frameRef    = useRef(0);

  // img→plane の対応
  const planesMapRef = useRef<Map<HTMLImageElement, ImagePlaneHandle>>(new Map());

  // パラメータを ref で保持（effect 再実行なしで intro→swiper 切り替え可能＝白フラッシュ防止）
  const paramsRef = useRef({ strength, speed, maxAmpPx, deadZonePx, damping });
  paramsRef.current = { strength, speed, maxAmpPx, deadZonePx, damping };
  
  useEffect(() => {
    // --- renderer / camera / scene ---
    const canvas = canvasRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0); // ★ 背景を完全透明に
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current = renderer;

    const fov = 60;
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 5000);
    camera.position.z = (window.innerHeight / 2) / Math.tan((fov / 2) * (Math.PI / 180));
    cameraRef.current = camera;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // --- class ImagePlane ---
    const loader = new THREE.TextureLoader();

    class ImagePlane {
      mesh: THREE.Mesh;
      img: HTMLImageElement;
      prevLeft = 0;
      ready = false; // ★ テクスチャ準備完了フラグ
      uniforms: {
        uTexture: { value: THREE.Texture };
        uTime:    { value: number };
        uAmpPx:   { value: number };
      };

      constructor(img: HTMLImageElement) {
        this.img = img;
        const tex = loader.load(
        img.src,
        () => {
          this.ready = true;
          this.img.style.transition = "opacity .25s ease";
          this.img.style.opacity = "0";
        }
      );
      this.uniforms = { uTexture: { value: tex }, uTime: { value: 0 }, uAmpPx: { value: 0 } };

        // 分割控えめでパフォーマンス寄り
        const geo = new THREE.PlaneGeometry(1, 1, 16, 16);
        const mat = new THREE.ShaderMaterial({
          uniforms: this.uniforms,
          transparent: true,
          vertexShader: VERT,   // 下部参照（配列join版）
          fragmentShader: FRAG,
          depthTest: false,
        });

        this.mesh = new THREE.Mesh(geo, mat);
        scene.add(this.mesh);

        // 初期配置
        this.setFromDOM();

      }

      setFromDOM() {
        const rect = this.img.getBoundingClientRect();
        this.mesh.scale.set(rect.width, rect.height, 1);

        // 画面中央原点座標へ変換
        const x = rect.left - window.innerWidth / 2 + rect.width / 2;
        const y = -rect.top  + window.innerHeight / 2 - rect.height / 2;
        this.mesh.position.set(x, y, 0);

        return rect;
      }

      update(): boolean {
        if (!this.img.isConnected) return false;
        if (!this.ready) return true; // ★ 読み込み前は更新だけ（黒塗り回避）

        const p = paramsRef.current;
        const rect = this.setFromDOM();

        // 横移動量（前フレームとの差分）
        const dx = this.prevLeft - rect.left;
        this.prevLeft = rect.left;

        // デッドゾーン＋穏やかな非線形（0.8乗）→強すぎを抑制
        const raw    = Math.max(0, Math.abs(dx) - p.deadZonePx);
        const eased  = Math.pow(raw, 0.8) * 0.5;
        const target = Math.min(eased * p.strength, p.maxAmpPx);

        // 減衰追従
        this.uniforms.uAmpPx.value = this.uniforms.uAmpPx.value * p.damping + target * (1 - p.damping);
        this.uniforms.uTime.value += 0.015 * p.speed;

        return true;
      }

      dispose() {
        this.img.style.opacity = "";
        (this.mesh.material as THREE.Material).dispose();
        (this.mesh.geometry as THREE.BufferGeometry).dispose();
        scene.remove(this.mesh);
      }
    }

    // --- 初回スキャン & 以後の差分反映 ---
    const mountExisting = () => {
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>(selector));
      const map = planesMapRef.current;

      // 追加
      imgs.forEach((img) => {
        if (!map.has(img)) {
          try {
            map.set(img, new ImagePlane(img));
          } catch (_) {}
        }
      });

      // 削除
      for (const [img, plane] of Array.from(map.entries())) {
        if (!imgs.includes(img) || !img.isConnected) {
          plane.dispose();
          map.delete(img);
        }
      }
    };
    mountExisting();

    // --- resize ---
    const onResize = () => {
      const r = rendererRef.current;
      const c = cameraRef.current;
      if (!r || !c) return;
      r.setPixelRatio(window.devicePixelRatio);
      r.setSize(window.innerWidth, window.innerHeight);
      c.aspect = window.innerWidth / window.innerHeight;
      c.position.z = (window.innerHeight / 2) / Math.tan((fov / 2) * (Math.PI / 180));
      c.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // --- loop ---
    const loop = () => {
      // 定期リスキャン（プレースホルダ→Swiper切替に追従）
      frameRef.current++;
      if (frameRef.current % rescanIntervalFrames === 0) {
        mountExisting();
      }

      // update all
      const map = planesMapRef.current;
      for (const [img, plane] of Array.from(map.entries())) {
        const alive = plane.update();
        if (!alive) {
          plane.dispose();
          map.delete(img);
        }
      }

      // render
      const r = rendererRef.current;
      const c = cameraRef.current;
      const s = sceneRef.current;
      if (r && c && s) r.render(s, c);

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    // --- cleanup ---
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);

      for (const [, plane] of planesMapRef.current) plane.dispose();
      planesMapRef.current.clear();

      rendererRef.current?.dispose();
      rendererRef.current = null;
      cameraRef.current = null;
      sceneRef.current = null;
    };
  }, [selector, rescanIntervalFrames]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none", // 下のUIをブロックしない
        zIndex: 10,
      }}
    />
  );
}

/* =========================
   GLSL（配列→joinで安全に埋め込み）
   ========================= */
const VERT = [
  "uniform float uTime;",
  "uniform float uAmpPx;",
  "varying vec2 vUv;",
  "void main(){",
  "  vUv = uv;",
  "  vec3 pos = position;",
  // 少しだけ強めにしたい場合は 140→130、0.6→0.7 など微調整
  "  float px = uAmpPx / 140.0;",
  "  float waveX = sin((uv.y * 3.4 + uTime)) * px * 0.6;",
  "  float waveY = cos((uv.x * 3.4 + uTime)) * px * 0.6;",
  "  pos.x += waveX;",
  "  pos.y += waveY;",
  "  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);",
  "}",
].join("\n");

const FRAG = [
  "uniform sampler2D uTexture;",
  "varying vec2 vUv;",
  "void main(){",
  "  gl_FragColor = texture2D(uTexture, vUv);",
  "}",
].join("\n");
