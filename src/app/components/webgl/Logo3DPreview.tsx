"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { loadExtrudedSvg, disposeExtrudedSvg } from "./ExtrudedSvg";

/**
 * SVG の押し出し具合を目で確かめるための確認用ビュー（/lab/logo3d）。
 * 本番に組み込む前にここで厚みとライトを詰める。ドラッグで回せる。
 */

export type Logo3DPreviewProps = {
  src: string;
  /** 最大辺に対する厚みの比率 */
  depth: number;
  /** 最大辺に対する角の丸みの比率。0.02 前後から見た目に効いてくる */
  bevel: number;
  /** 自動で回すか */
  autoRotate: boolean;
  /** 背景色 */
  background: string;
};

export default function Logo3DPreview({ src, depth, bevel, autoRotate, background }: Logo3DPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("読み込み中…");
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    camera.position.set(0, 0, 3.2);

    // 環境マップ。金属寄りのマテリアルは、これが無いと真っ黒になる
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2, 3, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 1.4);
    rim.position.set(-3, -1, -2);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 1.2;
    controls.maxDistance = 8;

    let logo: THREE.Group | null = null;
    // 丸みを増やすほど頂点が増えるので、ベベルの段数は丸みの大きさに合わせて上げる
    loadExtrudedSvg(src, {
      depth,
      bevel,
      bevelSegments: bevel > 0.03 ? 10 : bevel > 0.012 ? 8 : 3,
      fitTo: 1.6,
      curveSegments: 8,
    })
      .then((group) => {
        if (disposed) {
          disposeExtrudedSvg(group);
          return;
        }
        logo = group;
        scene.add(group);
        let meshes = 0;
        let tris = 0;
        group.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          meshes++;
          const idx = m.geometry.getIndex();
          tris += (idx ? idx.count : m.geometry.getAttribute("position").count) / 3;
        });
        setStatus(`${meshes} メッシュ / ${Math.round(tris).toLocaleString()} 三角形`);
      })
      .catch((e: unknown) => setStatus(`失敗: ${e instanceof Error ? e.message : String(e)}`));

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // 動きを減らす設定のときは自分から回さない（ドラッグ操作は残す）
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = clock.getDelta();
      if (logo && autoRotateRef.current && !motion.matches) {
        logo.rotation.y += dt * 0.5;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      if (logo) {
        scene.remove(logo);
        disposeExtrudedSvg(logo);
      }
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // src / depth / bevel が変わったらシーンごと作り直す（ジオメトリを作り直す必要があるため）
  }, [src, depth, bevel]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background }}>
      <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />
      <p
        style={{
          position: "absolute",
          left: 12,
          bottom: 10,
          margin: 0,
          font: "12px/1.4 ui-monospace, monospace",
          color: "rgba(255,255,255,0.65)",
          pointerEvents: "none",
        }}
      >
        {status}
      </p>
    </div>
  );
}
