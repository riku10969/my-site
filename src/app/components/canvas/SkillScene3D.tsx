"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const SKILL_IMAGES = [
  "/skill/branding1.jpg",
  "/skill/design1.jpg",
  "/skill/frontend1.jpg",
  "/RikuLogo3.png"
];

/** スクロール進行 0..1 をイージング（easeOutCubic） */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

type Props = {
  /** 0..1 スクロール進行（親で計算・イージング済み） */
  scrollProgress: number;
};

export default function SkillScene3D({ scrollProgress }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    progressRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0b0b0c, 0);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, -20);

    const scene = new THREE.Scene();

    // 控えめな環境光のみ
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.4);
    dir.position.set(2, 2, 5);
    scene.add(dir);

    // 各 Skill を Z 方向に奥に配置（パララックス用の深度差）
    const planeWidth = 4;
    const planeHeight = planeWidth * 0.6;
    const zSpacing = 5;
    const startZ = -4;
    const meshesRef = { current: [] as THREE.Mesh[] };
    const loader = new THREE.TextureLoader();

    SKILL_IMAGES.forEach((src, i) => {
      loader.load(
        src,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          const mat = new THREE.MeshLambertMaterial({
            map: tex,
            transparent: true,
            opacity: 0.92,
            side: THREE.DoubleSide,
          });
          const geo = new THREE.PlaneGeometry(planeWidth, planeHeight);
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.z = startZ - i * zSpacing;
          mesh.position.x = (i - 1.5) * 0.8;
          scene.add(mesh);
          meshesRef.current.push(mesh);
        },
        undefined,
        () => console.warn("Skill image load failed:", src)
      );
    });

    // カメラの移動範囲（Z 方向にゆっくり横断・控えめに）
    const cameraZStart = 8;
    const cameraZEnd = -16;
    const cameraXRange = 0.4;

    let rafId = 0;
    let currentProgress = 0;
    const LERP = 0.055;

    const loop = () => {
      rafId = requestAnimationFrame(loop);
      const target = progressRef.current;
      currentProgress += (target - currentProgress) * LERP;

      const t = easeOutCubic(Math.max(0, Math.min(1, currentProgress)));
      camera.position.z = THREE.MathUtils.lerp(cameraZStart, cameraZEnd, t);
      camera.position.x = THREE.MathUtils.lerp(0, cameraXRange, t * 0.5);
      camera.lookAt(0, 0, camera.position.z - 8);

      renderer.render(scene, camera);
    };
    loop();

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      meshesRef.current.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
      aria-hidden
    />
  );
}
