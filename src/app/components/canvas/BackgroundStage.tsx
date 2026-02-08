"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { noiseBackgroundVertex } from "./shaders/noiseBackgroundVertex";
import { noiseBackgroundFragment } from "./shaders/noiseBackgroundFragment";

export default function BackgroundStage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    // --- renderer ---
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    const maxDpr = 1.6;
    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      renderer.setPixelRatio(dpr);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
    };
    setSize();

    // --- camera/scene ---
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 2.8;
    const scene = new THREE.Scene();
    const clock = new THREE.Clock();

    // --- noise plane (画面ぴったり) ---
    const createFullScreenPlane = (zDepth = -5) => {
      const dist = Math.abs(zDepth - camera.position.z);
      const fovRad = (camera.fov * Math.PI) / 180;
      const h = 2 * Math.tan(fovRad / 2) * dist;
      const w = h * camera.aspect;
      return new THREE.PlaneGeometry(w, h);
    };

    const bgUniforms = { uTime: { value: 0 } };
    const bgMat = new THREE.ShaderMaterial({
      vertexShader: noiseBackgroundVertex,
      fragmentShader: noiseBackgroundFragment,
      uniforms: bgUniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const bg = new THREE.Mesh(createFullScreenPlane(-5), bgMat);
    bg.position.z = -5;
    bg.renderOrder = -1; // ノイズを最背面に
    scene.add(bg);

    // --- center logo (最初は非表示。イベントで出す) ---
    let logo: THREE.Mesh | null = null;
    let logoMat: THREE.MeshBasicMaterial | null = null;
    let logoBackdrop: THREE.Mesh | null = null;
    let logoActive = false;      // 表示開始フラグ
    let swayStrength = 0.02;     // ゆらぎ量（ロード後は少し弱めに）

    const loadLogo = () => {
      if (logo) return;
      const isMobile = typeof window !== "undefined" && window.innerWidth <= 767;
      const logoW = isMobile ? 2.2 : 3.6;
      const logoH = isMobile ? 2.0 : 3.0;
      new THREE.TextureLoader().load(
        "/RikuLogo3.png",
        (tex) => {
          tex.premultiplyAlpha = false;
          logoMat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            depthTest: false,
            alphaTest: 0.1,
            blending: THREE.NormalBlending,
          });
          logo = new THREE.Mesh(new THREE.PlaneGeometry(logoW, logoH), logoMat);
          logo.position.set(0, 0, -2); // 奥から
          logo.renderOrder = 2; // ノイズの上に描画
          // ノイズを隠す黒い面（ノイズの上に描画）
          const backdropMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            depthTest: false,
            depthWrite: false,
          });
          logoBackdrop = new THREE.Mesh(new THREE.PlaneGeometry(logoW, logoH), backdropMat);
          logoBackdrop.position.z = -0.05; // ロゴより少し奥
          logoBackdrop.renderOrder = 1; // ノイズの上、ロゴの下
          logo.add(logoBackdrop);
          scene.add(logo);
          logoActive = true;           // フェードイン開始
        },
        undefined,
        () => console.warn("logo image not found")
      );
    };

    // Loader からの起動イベント
    const onShowLogo = () => {
      loadLogo();
    };
    window.addEventListener("bg:showLogo", onShowLogo);

    // --- loop ---
    let raf = 0;
    const noiseSpeed = 60; // 砂嵐速度
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();

      // 背景ノイズ
      bgUniforms.uTime.value = t * noiseSpeed;

      // ロゴのフェード & ゆらぎ
        if (logo && logoMat && logo.visible !== false) {
        if (logoActive) {
          // フェードイン & 手前へ
          if (logoMat.opacity < 1) logoMat.opacity = Math.min(1, logoMat.opacity + 0.02);
          if (logo.position.z < 0) logo.position.z += 0.04;
          if (logoMat.opacity >= 1 && logo.position.z >= 0) {
            // 完了後はゆらぎだけ継続（少し弱く）
            logoActive = false;
            swayStrength = 0.012;
          }
        }
        // 常時ゆらゆら
        logo.rotation.z = Math.sin(t * 0.6) * 0.06;
        logo.rotation.y = Math.sin(t * 0.4) * 0.06;
        logo.position.x = Math.sin(t * 0.25) * swayStrength;
        logo.position.y = Math.cos(t * 0.2) * swayStrength;
      }

      renderer.render(scene, camera);
    };
    loop();

    // --- resize ---
    const onResize = () => {
      setSize();
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      const newGeo = createFullScreenPlane(-5);
      bg.geometry.dispose();
      bg.geometry = newGeo;
    };
    window.addEventListener("resize", onResize);

    // === 追加：ロゴ即消しイベント ===
     const onLogoHideImmediate = () => {
    if (logo && logoMat) {
     logoMat.opacity = 0;
     logo.visible = false;  // 子の backdrop も一緒に非表示
     logoActive = false;    // フェードインの途中でも止める
   }
 };
 window.addEventListener("bg:logo:hideImmediate", onLogoHideImmediate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("bg:showLogo", onShowLogo);
      window.removeEventListener("bg:logo:hideImmediate", onLogoHideImmediate);
      bg.geometry.dispose();
      bgMat.dispose();
      if (logo) {
        (logo.geometry as THREE.BufferGeometry).dispose();
        logoMat?.dispose();
        if (logoBackdrop) {
          (logoBackdrop.geometry as THREE.BufferGeometry).dispose();
          (logoBackdrop.material as THREE.Material).dispose();
        }
      }
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,          // ★ 背景層
        pointerEvents: "none",
      }}
    />
  );
}
