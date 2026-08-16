"use client";

import { useState } from "react";
import Logo3DPreview from "../../components/webgl/Logo3DPreview";

/**
 * SVG 押し出しの確認用ページ。本番の見た目を決めるための作業台なので、
 * サイトの導線からは外してある（URL 直打ちで開く）。
 */

const SOURCES = [
  { label: "RikuLogo", src: "/projects/RikuLogo.svg" },
  { label: "ContactLogo", src: "/projects/ContactLogo.svg" },
];

const BACKGROUNDS = ["#0b0b0c", "#f4f4f5", "#1b1030"];

export default function Logo3DLabPage() {
  const [src, setSrc] = useState(SOURCES[0].src);
  const [depth, setDepth] = useState(0.12);
  const [bevel, setBevel] = useState(0.02);
  const [autoRotate, setAutoRotate] = useState(true);
  const [background, setBackground] = useState(BACKGROUNDS[0]);

  return (
    <main className="flex h-[calc(100dvh-4rem)] flex-col">
      <div className="flex flex-wrap items-center gap-4 border-b border-white/15 px-4 py-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="opacity-70">SVG</span>
          <select
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            className="rounded border border-white/25 bg-black/40 px-2 py-1"
          >
            {SOURCES.map((s) => (
              <option key={s.src} value={s.src}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="opacity-70">厚み</span>
          <input
            type="range"
            min={0.01}
            max={0.4}
            step={0.01}
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
          />
          <span className="w-10 tabular-nums opacity-70">{depth.toFixed(2)}</span>
        </label>

        <label className="flex items-center gap-2">
          <span className="opacity-70">丸み</span>
          <input
            type="range"
            min={0}
            max={0.05}
            step={0.002}
            value={bevel}
            onChange={(e) => setBevel(Number(e.target.value))}
          />
          <span className="w-12 tabular-nums opacity-70">{bevel.toFixed(3)}</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoRotate}
            onChange={(e) => setAutoRotate(e.target.checked)}
          />
          <span className="opacity-70">回す</span>
        </label>

        <div className="flex items-center gap-2">
          <span className="opacity-70">背景</span>
          {BACKGROUNDS.map((bg) => (
            <button
              key={bg}
              type="button"
              onClick={() => setBackground(bg)}
              aria-label={`背景 ${bg}`}
              className={`h-5 w-5 rounded border ${
                background === bg ? "border-white" : "border-white/30"
              }`}
              style={{ background: bg }}
            />
          ))}
        </div>

        <span className="ml-auto opacity-50">ドラッグで回転 / ホイールで寄り引き</span>
      </div>

      <div className="min-h-0 flex-1">
        <Logo3DPreview
          src={src}
          depth={depth}
          bevel={bevel}
          autoRotate={autoRotate}
          background={background}
        />
      </div>
    </main>
  );
}
