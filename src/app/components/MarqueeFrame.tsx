"use client";
import React from "react";

type Props = {
  width?: number;
  height?: number;
  topCount?: number;
  bottomCount?: number;
  leftCount?: number;
  rightCount?: number;
};

export default function CompactMarquee({
  width = 300,
  height = 400,
  topCount = 4,     // ← 電球少なめ
  bottomCount = 4,
  leftCount = 6,
  rightCount = 6,
}: Props) {
  // 枠を細めに
  const outerR = Math.min(width, height) * 0.06;   // 角丸
  const outerInset = 6;                             // 外→ターコイズ
  const mintBand = Math.min(width, height) * 0.03;  // ミント帯細め
  const gap = Math.min(width, height) * 0.07;       // ミント↔パープル間
  const bulbD = Math.min(width, height) * 0.05;     // 電球直径小さめ
  const bulbR = bulbD / 2;

  const tealRect = {
    x: outerInset,
    y: outerInset,
    w: width - outerInset * 2,
    h: height - outerInset * 2,
    r: outerR,
  };

  const mintRect = {
    x: outerInset + mintBand,
    y: outerInset + mintBand,
    w: width - (outerInset + mintBand) * 2,
    h: height - (outerInset + mintBand) * 2,
    r: Math.max(outerR - 4, 4),
  };

  const purpleRect = {
    x: mintRect.x + gap,
    y: mintRect.y + gap,
    w: mintRect.w - gap * 2,
    h: mintRect.h - gap * 2,
    r: Math.max(outerR - 8, 4),
  };

  const channelRect = {
    x: mintRect.x,
    y: mintRect.y,
    w: mintRect.w,
    h: mintRect.h,
    r: mintRect.r,
    thickness: gap,
  };

  const ticks = (n: number) => Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));
  const usableW = channelRect.w - channelRect.r * 2;
  const usableH = channelRect.h - channelRect.r * 2;

  const topBulbs = ticks(topCount).map(t => ({
    cx: channelRect.x + channelRect.r + usableW * t,
    cy: channelRect.y + channelRect.thickness / 2,
  }));

  const bottomBulbs = ticks(bottomCount).map(t => ({
    cx: channelRect.x + channelRect.r + usableW * t,
    cy: channelRect.y + channelRect.h - channelRect.thickness / 2,
  }));

  const leftBulbs = ticks(leftCount).map(t => ({
    cx: channelRect.x + channelRect.thickness / 2,
    cy: channelRect.y + channelRect.r + usableH * t,
  }));

  const rightBulbs = ticks(rightCount).map(t => ({
    cx: channelRect.x + channelRect.w - channelRect.thickness / 2,
    cy: channelRect.y + channelRect.r + usableH * t,
  }));

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <filter id="bulbGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={bulbR * 0.8} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="channelClip">
          <rect
            x={channelRect.x}
            y={channelRect.y}
            width={channelRect.w}
            height={channelRect.h}
            rx={channelRect.r}
          />
        </clipPath>
      </defs>

      {/* 背面 */}
      <rect width={width} height={height} rx={outerR} fill="#111827" />

      {/* 外ターコイズ */}
      <rect x={tealRect.x} y={tealRect.y} width={tealRect.w} height={tealRect.h} rx={tealRect.r} fill="#0f9d8a" />

      {/* ミント帯 */}
      <rect x={mintRect.x} y={mintRect.y} width={mintRect.w} height={mintRect.h} rx={mintRect.r} fill="#69d3c6" />

      {/* パープル面 */}
      <rect x={purpleRect.x} y={purpleRect.y} width={purpleRect.w} height={purpleRect.h} rx={purpleRect.r} fill="#5c3897" />

      {/* 電球 */}
      <g clipPath="url(#channelClip)">
        {[...topBulbs, ...bottomBulbs, ...leftBulbs, ...rightBulbs].map((p, i) => (
          <circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r={bulbR}
            fill="#fff"
            stroke="rgba(0,0,0,.25)"
            filter="url(#bulbGlow)"
          />
        ))}
      </g>
    </svg>
  );
}
