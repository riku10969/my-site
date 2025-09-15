// app/components/PageLoaderGate.tsx
"use client";
import { useEffect, useState } from "react";
import MintGridLoader from "./MintGridLoader";

  type Props = {
  /** レンダープロップ: isLoaded を受け取って描画 */
  children: React.ReactNode | ((isLoaded: boolean) => React.ReactNode);
  /** ローディング時間（ms）任意 */
  minDuration?: number;
};

  export default function PageLoaderGate({ children, minDuration = 1200 }: Props) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsLoaded(true), minDuration);
    return () => clearTimeout(t);
  }, [minDuration]);

  if (!isLoaded) {
    return <MintGridLoader onFinish={() => setIsLoaded(true)} />;
  }

  // ★ children が関数なら呼び出して isLoaded を渡す
  return typeof children === "function"
    ? (children as (isLoaded: boolean) => React.ReactNode)(isLoaded)
    : children;
}

