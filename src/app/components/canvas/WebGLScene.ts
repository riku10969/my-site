// initWebGLScene.ts
import * as THREE from "three";
import { noiseBackgroundVertex } from "./shaders/noiseBackgroundVertex";
import { noiseBackgroundFragment } from "./shaders/noiseBackgroundFragment";

/** カメラから見えるスクリーン全面を覆う Plane を zDepth の位置で作る */
function createFullScreenPlane(camera: THREE.PerspectiveCamera, zDepth = -5) {
  const distance = Math.abs(zDepth - camera.position.z);
  const fovRad = (camera.fov * Math.PI) / 180;
  const height = 2 * Math.tan(fovRad / 2) * distance;
  const width = height * camera.aspect;
  return new THREE.PlaneGeometry(width, height);
}

/** 画面横幅の割合(0..1)で、zDepth位置に置くPlaneのワールド幅を返す */
function worldWidthForScreenFrac(camera: THREE.PerspectiveCamera, zDepth: number, frac: number) {
  const distance = Math.abs(zDepth - camera.position.z);
  const fovRad = (camera.fov * Math.PI) / 180;
  const screenH = 2 * Math.tan(fovRad / 2) * distance;
  const screenW = screenH * camera.aspect;
  return screenW * Math.max(0, Math.min(1, frac));
}

/** シンプルなモバイル判定 */
function isMobile() {
  return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 639px)").matches;
}

/**
 * 背景ノイズを画面ぴったりに描く WebGL シーンを初期化
 * - 背景ノイズは常にフルスクリーン
 * - リサイズ対応
 * - 任意で中央画像をフェードイン（afterTyping が true になったら）
 */
export function initWebGLScene(
  canvas: HTMLCanvasElement,
  opts?: {
    dprMax?: number;             // 最大ピクセル比（負荷調整）
    showCenterImage?: boolean;   // 中央画像を出すか
    afterTyping?: boolean;       // trueで画像フェードイン開始（外側で制御）
    imagePath?: string;          // 画像パス
    noiseSpeed?: number;         // 砂嵐の速さ係数
    centerFracDesktop?: number;  // 中央画像の画面幅比（デスクトップ）
    centerFracMobile?: number;   // 中央画像の画面幅比（モバイル）
    pointerEventsThrough?: boolean; // 背景をクリック透過に（デフォルト true）
  }
) {
  const mobile = isMobile();

  const {
    dprMax = mobile ? 1.2 : 1.6,
    showCenterImage = false,
    afterTyping = false,
    imagePath = "/uiux-riku-transparent.png",
    noiseSpeed = mobile ? 40 : 60,
    centerFracDesktop = 0.28,   // 画面幅の28%
    centerFracMobile = 0.42,    // モバイルは少し小さめに 42% → 必要に応じて下げる/上げる
    pointerEventsThrough = true,
  } = opts ?? {};

  // 背景用途ならクリック透過（ヘッダー等の操作をブロックしない）
  if (pointerEventsThrough) {
    canvas.style.pointerEvents = "none";
  }

  // ---- renderer / camera / scene ----
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  const dpr = Math.min(window.devicePixelRatio || 1, dprMax);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // 親の黒背景が透ける

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 2.8;

  const scene = new THREE.Scene();
  const clock = new THREE.Clock();

  // ---- 背景ノイズ（フルスクリーン） ----
  const bgUniforms = { uTime: { value: 0.0 } };
  const bgMaterial = new THREE.ShaderMaterial({
    vertexShader: noiseBackgroundVertex,
    fragmentShader: noiseBackgroundFragment,
    uniforms: bgUniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const bgPlane = new THREE.Mesh(createFullScreenPlane(camera, -5), bgMaterial);
  bgPlane.position.z = -5;
  scene.add(bgPlane);

  // ---- 中央画像（任意・フェードイン用） ----
  let uiuxMesh: THREE.Mesh | null = null;
  let uiuxMat: THREE.MeshBasicMaterial | null = null;
  // 現在の目標幅（画面幅の%）
  let currentFrac = mobile ? centerFracMobile : centerFracDesktop;

  if (showCenterImage) {
    const loader = new THREE.TextureLoader();
    loader.load(
      imagePath,
      (texture) => {
        uiuxMat = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0,      // 最初は透明
          depthWrite: false,
        });

        // 画像の横幅を “画面幅の割合” で決める
        const z = -2;
        const w = worldWidthForScreenFrac(camera, z, currentFrac);
        const aspect = texture.image ? texture.image.width / texture.image.height : 1;
        const h = w / Math.max(0.0001, aspect);
        const geo = new THREE.PlaneGeometry(w, h);

        uiuxMesh = new THREE.Mesh(geo, uiuxMat);
        uiuxMesh.position.set(0, 0, z); // 奥から出てくる
        scene.add(uiuxMesh);
      },
      undefined,
      (err) => {
        console.warn("image load error:", imagePath, err);
      }
    );
  }

  // ---- ループ ----
  let rafId = 0;
  const animate = () => {
    rafId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // 砂嵐時間（モバイルは少し遅く）
    bgUniforms.uTime.value = t * noiseSpeed;

    // 画像のフェードイン＆手前へ（afterTypingがtrueになったら）
    if (uiuxMesh && uiuxMat && opts?.afterTyping) {
      if (uiuxMat.opacity < 1) uiuxMat.opacity = Math.min(1, uiuxMat.opacity + 0.01);
      if (uiuxMesh.position.z < 0) uiuxMesh.position.z += 0.02;
    }

    renderer.render(scene, camera);
  };
  animate();

  // ---- リサイズ ----
  const onResize = () => {
    const dpr2 = Math.min(window.devicePixelRatio || 1, dprMax);
    renderer.setPixelRatio(dpr2);
    renderer.setSize(window.innerWidth, window.innerHeight);

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // 背景Planeを作り直し
    const newBgGeo = createFullScreenPlane(camera, -5);
    bgPlane.geometry.dispose();
    bgPlane.geometry = newBgGeo;

    // 中央画像の幅を再計算（画面幅の割合を保つ）
    if (uiuxMesh) {
      const isMob = isMobile();
      currentFrac = isMob ? centerFracMobile : centerFracDesktop;
      const z = uiuxMesh.position.z;
      const newW = worldWidthForScreenFrac(camera, z, currentFrac);
      // 既存のアスペクトを維持（geo.parameters は PlaneGeometry では undefined になり得るので texture から再計算）
      const meshMat = uiuxMesh.material as THREE.MeshBasicMaterial;
      const tex = meshMat.map;
      const aspect = tex && tex.image ? tex.image.width / tex.image.height : 1;
      const newH = newW / Math.max(0.0001, aspect);

      uiuxMesh.geometry.dispose();
      uiuxMesh.geometry = new THREE.PlaneGeometry(newW, newH);
    }
  };
  window.addEventListener("resize", onResize);

  // ---- 後始末 ----
  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
    bgPlane.geometry.dispose();
    bgMaterial.dispose();
    uiuxMesh?.geometry.dispose();
    uiuxMat?.dispose();
    renderer.dispose();
  };
}
