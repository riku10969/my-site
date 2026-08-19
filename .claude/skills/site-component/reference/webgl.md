# Three.js / WebGL

`three` 0.179。`@react-three/fiber` は入れていない。**素の three を `useEffect` の中で
命令的に組み立てる**のがこの repo の書き方。全て `"use client"`。

## この repo で使っている技術

| クラス | 何をするもの |
|---|---|
| `WebGLRenderer` | 描画先。`setSize(w, h, false)` で使う（下記） |
| `Scene` / `PerspectiveCamera` / `Group` | 構成の基本。`Group` は「まとめて回す」ための入れ物 |
| `PlaneGeometry` + `MeshBasicMaterial` | 写真を貼った板。ライト不要 |
| `ShaderMaterial` | GLSL を自前で書く面（`shaders/` に vertex / fragment を文字列で置く） |
| `TextureLoader` | 画像 → テクスチャ。**非同期**（下記） |
| `Points` + `PointsMaterial` + `BufferGeometry` | パーティクル（`NeonParticleStars`） |
| `SVGLoader` + `ExtrudeGeometry` | SVG のパスを押し出して 3D の塊に（`ExtrudedSvg.ts`） |
| `mergeGeometries`（examples/utils） | 大量のパスを色ごとに 1 メッシュへ集約 |
| `Clock` | 経過時間。シェーダーの `uTime` に流す |
| `AmbientLight` / `DirectionalLight` | `MeshStandardMaterial` を使うときだけ要る |

## 雛形 — canvas を持つコンポーネント

```tsx
"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Stage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // WebGL が無い環境では例外を投げる。握らないとページごと落ちる
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

    const geometry = new THREE.PlaneGeometry(1, 1);
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    // テクスチャの読み込みは非同期。unmount 後の scene.add を防ぐ
    let disposed = false;
    new THREE.TextureLoader().load("/x.webp", (tex) => {
      if (disposed) {
        tex.dispose();
        return;
      }
      textures.push(tex);
      const m = new THREE.MeshBasicMaterial({ map: tex });
      materials.push(m);
      scene.add(new THREE.Mesh(geometry, m));
    });

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      // 第 3 引数 false。省くと three が canvas に inline style を書き、CSS を上書きする
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let rafId = 0;
    const tick = () => {
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose()); // material を捨てても map は解放されない
      geometry.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}
```

## dispose の対応表

**作ったものは作った側が捨てる。** メッシュを走査して捨てると、共有している
geometry / material を二重に捨てることになる。作るときに配列へ集めておく。

| 作ったもの | 捨て方 |
|---|---|
| `Geometry` | `.dispose()` |
| `Material` | `.dispose()`。**`map` は解放されない** |
| `Texture` | `.dispose()` を別に呼ぶ |
| `WebGLRenderer` | `.dispose()` |
| `RenderTarget` | `.dispose()` |
| rAF | `cancelAnimationFrame` |
| イベント / Observer | `removeEventListener` / `disconnect()` |

## rAF を止める

このサイトは 1 ページが 10 画面ぶんある。**画面外でも回り続けるので必ず止める。**
止める理由は同時に複数立ちうるので、**理由を `Set` で持ち、ひとつでも残っている間は
止め続ける**（`MarqueeLoop` / `SkillIntroStage` が同じ形）。

| 止める条件 | 手段 |
|---|---|
| タブが非表示 | `document.addEventListener("visibilitychange", ...)` |
| 要素が画面外 | `IntersectionObserver`（ScrollTrigger の `onToggle` でもよい） |
| 動きを減らす設定 | ループを作らず 1 フレームだけ描く |

`IntersectionObserver` / ScrollTrigger の `onToggle` は**最初から画面外だと呼ばれない**。
初期状態は自分で反映する。

## 落とし穴

- **canvas に直接 `inset` を当てても箱は広がらない。** canvas は置換要素なので
  `width`/`height` が `auto` だと固有サイズ（300×150）で解決される。
  ラッパーを広げて canvas は `%` で埋める
- **CSS 3D（`preserve-3d`）は祖先の `overflow` / `filter` / `opacity` で潰れる。**
  `overflow-hidden` を持つ箱の中で立体を出したいなら WebGL のほうが衝突しない
- **裏を向いた面は `FrontSide` のカリングで消える。** `DoubleSide` にすると鏡文字になる。
  文字や写真なら**同じ位置に外向き・内向きの 2 枚を背中合わせで置く**
  （カリングで片方が捨てられるので z ファイティングは起きない）
- **カメラを近づけると手前の 1 枚だけ極端に大きくなる。** 遠近差は距離で決まる。
  引いて画角を狭めるほうが収まる
- **ワールドの +X は画面の右とは限らない。** ラッパーを CSS で回しているなら、
  その逆回転を掛けた成分で置く

## シェーダー

GLSL は `webgl/shaders/` に**文字列としてエクスポート**する（ローダー設定を足さない）。
`uniform` の受け渡しは `material.uniforms.uTime.value = clock.getElapsedTime()`。

## 画像

`public/` は原本の置き場ではない。追加したら `npm run images` で確認 →
`npm run images:apply` で WebP に変換する（`scripts/optimize-images.mjs`）。
