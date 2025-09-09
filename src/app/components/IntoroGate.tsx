"use client";
import { useEffect, useState } from "react";
import Loader from "./Loader"; // 既存のタイプ演出付きLoader

export default function IntroGate({ children }: { children: React.ReactNode }) {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    // 初回判定（タブ毎に1回なら sessionStorage、完全永続なら localStorage に変更）
    const seen = sessionStorage.getItem("introSeen");
    setShowIntro(!seen);
    if (!seen) {
      // 背景ロゴの“イントロ演出つき表示”を開始（奥からフェードイン）
      window.dispatchEvent(new CustomEvent("bg:showLogo"));
    }
  }, []);

  const handleFinish = () => {
    sessionStorage.setItem("introSeen", "1");
    setShowIntro(false);
  };

  return (
    <>
      {children}
      {showIntro && (
        <Loader
          onFinish={handleFinish}
          // 必要なら text / charDelayMs / minShowMs をここで指定
        />
      )}
    </>
  );
}
