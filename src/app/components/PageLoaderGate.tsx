// app/components/PageLoaderGate.tsx
"use client";
import { useEffect, useState } from "react";
import MintGridLoader from "./MintGridLoader";

export default function PageLoaderGate({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(true);     // ローダーをDOMから消すか
  const [reveal, setReveal] = useState(false); // 退場アニメを始めるか

  useEffect(() => {
    // ここは実データ完了をトリガーにしてOK（下はデモで少し待つ）
    const t = setTimeout(() => setReveal(true), 400);
    return () => clearTimeout(t);
  }, []);

  if (!show) return <>{children}</>;
  return (
    <>
      {children}
      <MintGridLoader reveal={reveal} onFinish={() => setShow(false)} />
    </>
  );
}
