"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const PARTICLE_COUNT = 1200;
const SPREAD_X = 10;
const SPREAD_Y = 8;
const Z_NEAR = 3;
const Z_FAR = 22;
const Z_DRIFT_SPEED = 0.012;
const WOBBLE_AMOUNT = 0.06;

/** 円形＋中心明るく外側フェードのグラデーションテクスチャ */
function createStarTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const r = cx;
  const gradient = ctx.createRadialGradient(cx, cx, 0, cx, cx, r);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.5)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.15)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [f(0), f(8), f(4)]; // 0..1 for Three.js vertex colors
}

/** シアン25% / パープル70% / ピンク5%。HSLで微差のみ。 */
function pickColor(i: number): [number, number, number] {
  const r = i % 100;
  let h: number, s: number, l: number;
  if (r < 25) {
    h = 175 + (i % 11) - 5;
    s = 88 + (i % 5);
    l = 52 + (i % 7);
  } else if (r < 95) {
    h = 265 + (i % 11) - 5;
    s = 85 + (i % 8);
    l = 55 + (i % 10);
  } else {
    h = 325 + (i % 11) - 5;
    s = 82 + (i % 6);
    l = 58 + (i % 6);
  }
  return hslToRgb(h, s, l);
}

/** 小80% / 中15% / 大5%。ランダム幅は最小限。 */
function pickSize(i: number): "s" | "m" | "l" {
  const r = i % 100;
  if (r < 80) return "s";
  if (r < 95) return "m";
  return "l";
}

function useIsMobile() {
  const [mobile, setMobile] = React.useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const fn = () => setMobile(mql.matches);
    fn();
    mql.addEventListener("change", fn);
    return () => mql.removeEventListener("change", fn);
  }, []);
  return mobile;
}

export default function NeonParticleStars() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const particleCount = isMobile ? 520 : PARTICLE_COUNT;

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    const w = container.offsetWidth || 1;
    const h = container.offsetHeight || 1;
    renderer.setSize(w, h);
    renderer.setClearColor(0x060612, 1);

    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, 10);

    const scene = new THREE.Scene();
    const starTexture = createStarTexture();

    const CENTER_RADIUS = 2.2;
    function isInCenter(x: number, y: number) {
      return x * x + y * y < CENTER_RADIUS * CENTER_RADIUS;
    }

    const byLayer: { center: number[]; outer: number[] } = { center: [], outer: [] };

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const baseX = new Float32Array(particleCount);
    const baseY = new Float32Array(particleCount);
    const baseZ = new Float32Array(particleCount);
    const phase = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 2 * SPREAD_X;
      const y = (Math.random() - 0.5) * 2 * SPREAD_Y;
      const z = Z_NEAR + Math.random() * (Z_FAR - Z_NEAR);

      baseX[i] = x;
      baseY[i] = y;
      baseZ[i] = z;
      phase[i] = Math.random() * Math.PI * 2;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const [r, g, b] = pickColor(i);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      if (isInCenter(x, y)) byLayer.center.push(i);
      else byLayer.outer.push(i);
    }

    const sizeValues = { s: 0.52, m: 0.82, l: 1.15 };
    const createPoints = (
      indices: number[],
      size: number,
      opacity: number
    ): THREE.Points => {
      const pos = new Float32Array(indices.length * 3);
      const col = new Float32Array(indices.length * 3);
      indices.forEach((idx, i) => {
        pos[i * 3] = positions[idx * 3];
        pos[i * 3 + 1] = positions[idx * 3 + 1];
        pos[i * 3 + 2] = positions[idx * 3 + 2];
        col[i * 3] = colors[idx * 3];
        col[i * 3 + 1] = colors[idx * 3 + 1];
        col[i * 3 + 2] = colors[idx * 3 + 2];
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({
        size,
        sizeAttenuation: true,
        vertexColors: true,
        map: starTexture,
        transparent: true,
        opacity: THREE.MathUtils.clamp(opacity, 0.3, 0.6),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      return new THREE.Points(geo, mat);
    };

    const pointGroups: {
      points: THREE.Points;
      baseZArr: Float32Array;
      baseX: number[];
      baseY: number[];
      phase: number[];
      n: number;
    }[] = [];

    ([[byLayer.outer, 0.48], [byLayer.center, 0.24]] as const).forEach(([indices, opacity]) => {
      const bySizeLocal: { s: number[]; m: number[]; l: number[] } = { s: [], m: [], l: [] };
      indices.forEach((idx) => {
        const kind = pickSize(idx);
        bySizeLocal[kind].push(idx);
      });
      ([["s", sizeValues.s], ["m", sizeValues.m], ["l", sizeValues.l]] as const).forEach(([k, size]) => {
        const arr = bySizeLocal[k];
        if (arr.length === 0) return;
        const pts = createPoints(arr, size, opacity);
        scene.add(pts);
        const baseZArr = new Float32Array(arr.length);
        arr.forEach((idx, i) => (baseZArr[i] = baseZ[idx]));
        pointGroups.push({
          points: pts,
          baseZArr,
          baseX: arr.map((idx) => baseX[idx]),
          baseY: arr.map((idx) => baseY[idx]),
          phase: arr.map((idx) => phase[idx]),
          n: arr.length,
        });
      });
    });

    let rafId = 0;
    let start = 0;

    const loop = (t: number) => {
      rafId = requestAnimationFrame(loop);
      if (!start) start = t;
      const time = (t - start) * 0.001;
      const zOffset = time * Z_DRIFT_SPEED * 40;
      const range = Z_FAR - Z_NEAR;

      pointGroups.forEach(({ points, baseZArr, baseX: bx, baseY: by, phase: ph, n }) => {
        const geom = points.geometry;
        const posAttr = geom.getAttribute("position") as THREE.BufferAttribute;
        const pos = posAttr.array as Float32Array;
        for (let i = 0; i < n; i++) {
          const d = baseZArr[i] - zOffset;
          const z = Z_NEAR + ((((d - Z_NEAR) % range) + range) % range);
          const wobble = Math.sin(time * 0.15 + ph[i]) * WOBBLE_AMOUNT;
          pos[i * 3] = bx[i] + wobble;
          pos[i * 3 + 1] = by[i] + Math.cos(time * 0.12 + ph[i] * 1.1) * WOBBLE_AMOUNT;
          pos[i * 3 + 2] = z;
        }
        posAttr.needsUpdate = true;
      });

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(loop);

    const onResize = () => {
      if (!container) return;
      const cw = container.offsetWidth || 1;
      const ch = container.offsetHeight || 1;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(cw, ch);
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(() => onResize());
    ro.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      pointGroups.forEach((g) => {
        g.points.geometry.dispose();
        (g.points.material as THREE.Material).dispose();
      });
      starTexture.dispose();
      renderer.dispose();
      if (container && canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, [isMobile]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden
    />
  );
}
