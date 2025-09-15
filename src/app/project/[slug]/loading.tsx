"use client";

import { useState, useEffect } from "react";
import AboutSection from "../../components/sections/AboutSection";
import MintGridLoader from "../../components/MintGridLoader"; // ← 必要ならこっちに差し替え可

export default function Page() {
  const [isLoaded, setIsLoaded] = useState(false);

  // ここでローディング終了タイミングを管理
  useEffect(() => {
    // 例：2.5秒後に読み込み完了として切り替え
    const timer = setTimeout(() => setIsLoaded(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* isLoaded が false の間だけローディング演出を表示 */}
      {!isLoaded && <MintGridLoader onFinish={() => setIsLoaded(true)} />}
      {/* ロード完了後に AboutSection を表示 */}
      {isLoaded && <AboutSection isLoaded={isLoaded} />}
    </>
  );
}
