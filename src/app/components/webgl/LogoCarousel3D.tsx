"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { loadExtrudedSvg, disposeExtrudedSvg } from "./ExtrudedSvg";

/**
 * 押し出した 3D ロゴを回転木馬のように並べる。トップの写真カードの代わり。
 *
 * - 最初は画面外（右）から順に流れてくる
 * - 前面の 1 つだけ大きく、残りは奥の左右に小さく待機する
 * - 一定時間ごと、または左右の矢印で前面が入れ替わる
 *
 * canvas は 1 枚だけ。ロゴごとに canvas を作ると WebGL コンテキストが
 * 増えるので、1 つのシーンに Group を並べて位置と拡大率で見せ分ける。
 */

export type LogoIcon = {
  title: string;
  src: string;
  path: string;
};

export type LogoCarousel3DProps = {
  icons: LogoIcon[];
  /** 前面のロゴがクリックされたときに呼ぶ。ページ遷移は呼び出し側の責任 */
  onSelect: (icon: LogoIcon) => void;
  /** 前面が自動で切り替わる間隔（ms）。0 で自動切り替えなし */
  autoplayMs?: number;
  /** 最大辺に対する厚みの比率 */
  depth?: number;
  /** 最大辺に対する角の丸みの比率 */
  bevel?: number;
};

/** ロゴ 1 つの大きさ（前面のとき） */
const ICON_SIZE = 1.6;
/** 待機列の位置。奥に下げて小さくする */
const SIDE_X = 2.6;
const SIDE_Z = -2.8;
const SIDE_SCALE = 0.4;
const FRONT_Z = 0.9;
/** 流れ込みの開始位置。画面の外に置く */
const ENTER_X = 10;
/** 1 つあたりの流れ込みの間隔（秒） */
const ENTER_STAGGER = 0.28;

/** i が active から見て何番目か。3 つなら -1 / 0 / +1 に畳む */
function relativeSlot(i: number, active: number, n: number) {
  let rel = ((i - active) % n + n) % n;
  if (rel > n / 2) rel -= n;
  return rel;
}

export default function LogoCarousel3D({
  icons,
  onSelect,
  autoplayMs = 3800,
  depth = 0.12,
  bevel = 0.02,
}: LogoCarousel3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(0);
  const [hoveringFront, setHoveringFront] = useState(false);

  const n = icons.length;

  // ループから読むだけの値は ref に逃がす。effect を貼り直したくない
  const activeRef = useRef(active);
  activeRef.current = active;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const iconsRef = useRef(icons);
  iconsRef.current = icons;

  const go = useCallback(
    (delta: number) => setActive((a) => (((a + delta) % n) + n) % n),
    [n]
  );

  // --- 自動切り替え。手動操作のたびに active が変わるので、待ち時間も仕切り直しになる ---
  useEffect(() => {
    if (!autoplayMs || !ready) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => go(1), autoplayMs);
    return () => window.clearTimeout(id);
  }, [active, autoplayMs, ready, go]);

  // --- キーボードでも動かせるようにする ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(2, 3, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x88aaff, 1.2);
    fill.position.set(-3, -1, 2);
    scene.add(fill);
    const back = new THREE.DirectionalLight(0xffd0a0, 0.9);
    back.position.set(0, 2, -4);
    scene.add(back);
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));

    const root = new THREE.Group();
    scene.add(root);

    /**
     * 当たり判定はロゴ本体ではなく、この見えない板で取る。
     *
     * Raycaster は BVH を持たず総当たりで三角形を見るので、ロゴ本体
     * （3 つで約 25 万三角形）に毎フレーム当てると描画より重くなる。
     * Raycaster は visible を見ないため、visible=false のままで拾える。
     */
    const hitGeometry = new THREE.PlaneGeometry(ICON_SIZE, ICON_SIZE);
    const hitMaterial = new THREE.MeshBasicMaterial();
    const hitMeshes: THREE.Mesh[] = [];

    type Slot = {
      group: THREE.Group;
      hit: THREE.Mesh;
      index: number;
      spin: number;
      scale: number;
      /** 流れ込みが始まるまでの待ち（秒） */
      delay: number;
      entered: boolean;
    };
    const slots: Slot[] = [];

    let cancelled = false;
    Promise.all(
      icons.map((icon) =>
        loadExtrudedSvg(icon.src, {
          depth,
          bevel,
          bevelSegments: bevel > 0.012 ? 8 : 3,
          fitTo: ICON_SIZE,
          curveSegments: 6, // 3 つ同時に出すので分割は控えめに
        })
      )
    )
      .then((groups) => {
        if (disposed || cancelled) {
          groups.forEach(disposeExtrudedSvg);
          return;
        }
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        groups.forEach((group, i) => {
          const holder = new THREE.Group();
          holder.add(group);
          // 画面の外から始める。動きを減らす設定のときは最初から定位置に置く
          holder.position.set(reduced ? 0 : ENTER_X, 0, FRONT_Z);
          holder.scale.setScalar(SIDE_SCALE);
          root.add(holder);

          // 板はロゴと一緒に回ると横から当たらなくなるので、holder ではなく
          // root の子にして常に正面を向けたままにする
          const hit = new THREE.Mesh(hitGeometry, hitMaterial);
          hit.visible = false;
          hit.userData.index = i;
          root.add(hit);
          hitMeshes.push(hit);

          slots.push({
            group: holder,
            hit,
            index: i,
            spin: 0,
            scale: SIDE_SCALE,
            delay: reduced ? 0 : i * ENTER_STAGGER,
            entered: reduced,
          });
        });
        setReady(true);
      })
      .catch((e: unknown) => console.warn("3D ロゴの読み込みに失敗:", e));

    // --- 当たり判定 ---
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerInside = false;
    let hoverIndex: number | null = null;
    let frontHoveredPrev = false;

    const hitIndex = (): number | null => {
      if (!pointerInside || !hitMeshes.length) return null;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitMeshes, false);
      return hits.length ? (hits[0].object.userData.index as number) : null;
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerInside = true;
    };
    const onPointerLeave = () => {
      pointerInside = false;
    };
    /** 前面ならページへ、待機列なら前面へ持ってくる */
    const onClick = () => {
      if (hoverIndex === null) return;
      if (hoverIndex === activeRef.current) {
        const icon = iconsRef.current[hoverIndex];
        if (icon) onSelectRef.current(icon);
      } else {
        setActive(hoverIndex);
      }
    };
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("click", onClick);

    // --- 画面サイズに合わせる ---
    let narrow = false;
    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      narrow = camera.aspect < 1.1;
      // 待機列が画面内に収まる位置までカメラを引く
      const fovRad = (camera.fov * Math.PI) / 180;
      const halfW = Math.tan(fovRad / 2) * camera.aspect;
      const needed = (SIDE_X + ICON_SIZE * SIDE_SCALE) / halfW + Math.abs(SIDE_Z);
      camera.position.z = Math.max(6, needed);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const clock = new THREE.Clock();
    const target = new THREE.Vector3();
    let elapsed = 0;
    let raf = 0;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      elapsed += dt;

      const activeNow = activeRef.current;
      const nextHover = hitIndex();
      // 毎フレーム React に伝えると無駄なので、変わったときだけ触る
      if (nextHover !== hoverIndex) {
        hoverIndex = nextHover;
        renderer.domElement.style.cursor = hoverIndex === null ? "" : "pointer";
      }
      const frontHovered = hoverIndex !== null && hoverIndex === activeNow;
      if (frontHovered !== frontHoveredPrev) {
        frontHoveredPrev = frontHovered;
        setHoveringFront(frontHovered);
      }

      for (const s of slots) {
        const isFront = s.index === activeNow;
        const rel = relativeSlot(s.index, activeNow, slots.length);
        // 縦長の画面では待機列を狭めて、前面のロゴに重ならないようにする
        const sideX = narrow ? SIDE_X * 0.72 : SIDE_X;

        if (isFront) target.set(0, 0, FRONT_Z);
        else target.set(Math.sign(rel) * sideX, -0.15, SIDE_Z);

        if (!s.entered) {
          if (elapsed < s.delay) continue; // まだ画面外で待つ
          s.entered = true;
        }

        // 流れ込みも入れ替えも同じ追従で処理する。到着間際ほど減速する
        const k = Math.min(1, dt * 3.4);
        s.group.position.lerp(target, k);
        s.hit.position.copy(s.group.position);

        const wantScale = isFront ? 1 : SIDE_SCALE;
        s.scale += (wantScale - s.scale) * k;
        s.group.scale.setScalar(s.scale);
        s.hit.scale.setScalar(s.scale);

        if (!motion.matches) {
          // 前面はゆっくり自転、待機列はさらに遅く。ホバーで少し速める
          const hovering = hoverIndex === s.index;
          s.spin += dt * ((isFront ? 0.5 : 0.22) + (hovering ? 0.9 : 0));
          s.group.rotation.y = s.spin;
          s.group.rotation.x = Math.sin(s.spin * 0.6 + s.index) * (isFront ? 0.1 : 0.05);
        }
      }

      renderer.render(scene, camera);
    };
    loop();

    return () => {
      disposed = true;
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("click", onClick);
      slots.forEach((s) => {
        root.remove(s.group);
        root.remove(s.hit);
        s.group.children.forEach((child) => disposeExtrudedSvg(child as THREE.Group));
      });
      hitGeometry.dispose();
      hitMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // icons は毎レンダーで新しい配列になりうるので、中身の識別子だけを見る
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [icons.map((i) => i.src).join("|"), depth, bevel]);

  const arrow =
    "pointer-events-auto grid h-11 w-11 place-items-center rounded-full border " +
    "border-white/25 bg-black/30 text-white/80 backdrop-blur-sm transition " +
    "hover:border-white/60 hover:text-white focus-visible:outline focus-visible:outline-2";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: ready ? 1 : 0,
        transition: "opacity 700ms ease",
      }}
    >
      <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />

      {/* 前面のロゴの名前。3D の中に文字を作るより読みやすく、
          サイトの書体をそのまま使える */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[14%] text-center">
        {/* 3 つを 1 マスのグリッドに重ねて、前面のものだけ見せる。
            高さが一番大きい名前で決まるので、切り替わっても下の行がずれない */}
        <div className="grid">
          {icons.map((icon, i) => (
            <span
              key={icon.src}
              className="col-start-1 row-start-1 font-display tracking-[0.22em]
                         text-[clamp(16px,2.4vw,26px)] transition-all duration-500"
              style={{
                opacity: i === active ? 1 : 0,
                transform: i === active ? "translateY(0)" : "translateY(6px)",
                textShadow: "0 0 18px rgba(255,255,255,0.3)",
              }}
              aria-hidden={i !== active}
            >
              {icon.title}
            </span>
          ))}
        </div>
        <span
          className="mt-3 block text-[11px] tracking-[0.2em] text-white/45 transition-opacity duration-300"
          style={{ opacity: hoveringFront ? 1 : 0 }}
        >
          CLICK TO OPEN
        </span>
      </div>

      {/* 左右の矢印 */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-[4vw]">
        <button type="button" className={arrow} onClick={() => go(-1)} aria-label="前のロゴ">
          ‹
        </button>
        <button type="button" className={arrow} onClick={() => go(1)} aria-label="次のロゴ">
          ›
        </button>
      </div>
    </div>
  );
}
