"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { noiseBackgroundVertex } from "./shaders/noiseBackgroundVertex";
import { noiseBackgroundFragment } from "./shaders/noiseBackgroundFragment";

/**
 * サイト全体の背景（砂嵐ノイズ + 中央ロゴ）。
 * ページ内で唯一の WebGL コンテキストなので、ここで描画のオン/オフを一元管理する。
 * - タブが非表示（document.hidden）の間は rAF を止める
 * - prefers-reduced-motion: reduce のときはループを回さず 1 枚だけ描く
 */
export default function BackgroundStage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    // --- renderer ---
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace; // 背景ハートを元の色で表示
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

    const isDesktop = typeof window !== "undefined" && window.innerWidth > 767;
    const fadeInSpeed = isDesktop ? 0.011 : 0.02;   // デスクトップはややゆっくりフェード
    const moveInSpeed = isDesktop ? 0.022 : 0.04;  // デスクトップはややゆっくり手前に

    const loadLogo = () => {
      if (logo) return;
      const isMobile = typeof window !== "undefined" && window.innerWidth <= 767;
      const logoW = isMobile ? 2.2 : 3.6;
      const logoH = isMobile ? 2.0 : 3.0;
      new THREE.TextureLoader().load(
        "/RikuLogo3.webp",
        (tex) => {
          tex.premultiplyAlpha = false;
          tex.colorSpace = THREE.SRGBColorSpace; // PNG の元の色（薄くならない）
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
          requestStaticRender();       // 静止モードでもロゴが出るように
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

    // --- draw ---
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;

    const noiseSpeed = 60; // 砂嵐速度
    // uTime の折り返し。シェーダーの hash は fract(sin(dot(...))) なので、
    // 引数が大きくなるほど float の刻みが粗くなり粒がにじむ。値は乱数なので
    // 折り返しても見た目は変わらない。
    const noiseTimeWrap = 100;

    let elapsed = 0; // 描画している間だけ進む時間

    const drawFrame = () => {
      // 背景ノイズ
      bgUniforms.uTime.value = (elapsed * noiseSpeed) % noiseTimeWrap;

      // ロゴのフェード & ゆらぎ
      if (logo && logoMat && logo.visible !== false) {
        if (reducedMotion) {
          // 動きを減らす設定：アニメーションせず完成状態で出す
          if (logoActive) {
            logoMat.opacity = 1;
            logo.position.z = 0;
            logoActive = false;
            window.dispatchEvent(new CustomEvent("heart:complete"));
          }
        } else {
          if (logoActive) {
            // フェードイン & 手前へ（デスクトップはゆっくり）
            if (logoMat.opacity < 1) logoMat.opacity = Math.min(1, logoMat.opacity + fadeInSpeed);
            if (logo.position.z < 0) logo.position.z += moveInSpeed;
            if (logoMat.opacity >= 1 && logo.position.z >= 0) {
              // 完了後はゆらぎだけ継続（少し弱く）
              logoActive = false;
              swayStrength = 0.012;
              window.dispatchEvent(new CustomEvent("heart:complete"));
            }
          }
          // 常時ゆらゆら
          logo.rotation.z = Math.sin(elapsed * 0.6) * 0.06;
          logo.rotation.y = Math.sin(elapsed * 0.4) * 0.06;
          logo.position.x = Math.sin(elapsed * 0.25) * swayStrength;
          logo.position.y = Math.cos(elapsed * 0.2) * swayStrength;
        }
      }

      renderer.render(scene, camera);
    };

    // --- loop control ---
    let raf = 0;      // ループ中のみ非 0
    let onceRaf = 0;  // 静止モードの単発描画

    const loop = () => {
      raf = requestAnimationFrame(loop);
      elapsed += clock.getDelta();
      drawFrame();
    };

    /** ループを回さないとき（静止 / リサイズ後）に 1 枚だけ描き直す */
    const requestStaticRender = () => {
      if (raf || onceRaf || document.hidden) return;
      onceRaf = requestAnimationFrame(() => {
        onceRaf = 0;
        drawFrame();
      });
    };

    const stopLoop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    /** 「動かす条件が揃っているか」を見て描画を開始／停止する */
    const syncRunState = () => {
      if (document.hidden || reducedMotion) {
        stopLoop();
        requestStaticRender();
        return;
      }
      if (raf) return;
      clock.getDelta(); // 止まっていた間の差分を捨てる（時間が飛ばないように）
      loop();
    };
    syncRunState();

    const onVisibilityChange = () => syncRunState();
    document.addEventListener("visibilitychange", onVisibilityChange);

    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
      syncRunState();
    };
    motionQuery.addEventListener("change", onMotionChange);

    // --- resize ---
    const onResize = () => {
      setSize();
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      const newGeo = createFullScreenPlane(-5);
      bg.geometry.dispose();
      bg.geometry = newGeo;
      requestStaticRender(); // 静止中でもリサイズ結果を反映
    };
    window.addEventListener("resize", onResize);

    // === 追加：ロゴ即消しイベント ===
    const onLogoHideImmediate = () => {
      if (logo && logoMat) {
        logoMat.opacity = 0;
        logo.visible = false;  // 子の backdrop も一緒に非表示
        logoActive = false;    // フェードインの途中でも止める
        requestStaticRender();
      }
    };
    window.addEventListener("bg:logo:hideImmediate", onLogoHideImmediate);

    return () => {
      stopLoop();
      if (onceRaf) cancelAnimationFrame(onceRaf);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      motionQuery.removeEventListener("change", onMotionChange);
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
