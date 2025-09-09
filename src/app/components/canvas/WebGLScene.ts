// initWebGLScene.ts
import * as THREE from "three";
import { noiseBackgroundVertex } from "./shaders/noiseBackgroundVertex";
import { noiseBackgroundFragment } from "./shaders/noiseBackgroundFragment";

/**
 * カメラから見えるスクリーン全面を覆う Plane を zDepth の位置で作る
 */
function createFullScreenPlane(camera: THREE.PerspectiveCamera, zDepth = -5) {
  const distance = Math.abs(zDepth - camera.position.z);
  const fovRad = (camera.fov * Math.PI) / 180;
  const height = 2 * Math.tan(fovRad / 2) * distance;
  const width = height * camera.aspect;
  return new THREE.PlaneGeometry(width, height);
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
    dprMax?: number;           // 最大ピクセル比（負荷調整）
    showCenterImage?: boolean; // 中央画像を出すか
    afterTyping?: boolean;     // trueで画像フェードイン開始（外側で制御）
    imagePath?: string;        // 画像パス
    noiseSpeed?: number;       // 砂嵐の速さ係数
  }
) {
  const {
    dprMax = 1.6,
    showCenterImage = false,
    afterTyping = false,
    imagePath = "/uiux-riku-transparent.png",
    noiseSpeed = 60,
  } = opts ?? {};

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
    transparent: true,   // フラグメントの α を活かす
    depthTest: false,
    depthWrite: false,
  });
  const bgPlane = new THREE.Mesh(createFullScreenPlane(camera, -5), bgMaterial);
  bgPlane.position.z = -5; // 画面の奥に固定
  scene.add(bgPlane);

  // ---- 中央画像（任意・フェードイン用） ----
  let uiuxMesh: THREE.Mesh | null = null;
  let uiuxMat: THREE.MeshBasicMaterial | null = null;
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
        const geo = new THREE.PlaneGeometry(6, 6); // お好みで
        uiuxMesh = new THREE.Mesh(geo, uiuxMat);
        uiuxMesh.position.set(0, 0, -2); // 奥から出てくる
        scene.add(uiuxMesh);
      },
      undefined,
      (err) => {
        // 読み込み失敗しても他は動かす
        console.warn("image load error:", imagePath, err);
      }
    );
  }

  // ---- ループ ----
  let rafId = 0;
  const animate = () => {
    rafId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // 砂嵐時間
    bgUniforms.uTime.value = t * noiseSpeed;

    // 画像のフェードイン＆手前へ（afterTypingがtrueになったら）
    if (uiuxMesh && uiuxMat && opts?.afterTyping) {
      if (uiuxMat.opacity < 1) uiuxMat.opacity = Math.min(1, uiuxMat.opacity + 0.01);
      if (uiuxMesh.position.z < 0) uiuxMesh.position.z += 0.02;
      // フェード＆前進が終わったら止めたい場合はここでフラグ管理も可
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

    // ★ ここがポイント：背景ノイズPlaneを“画面ぴったり”に作り直す
    const newBgGeo = createFullScreenPlane(camera, -5);
    bgPlane.geometry.dispose();
    bgPlane.geometry = newBgGeo;
  };
  window.addEventListener("resize", onResize);

  // ---- 後始末を返す（ページ遷移時などに呼ぶ）----
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
