"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function RouteLogoController() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith("/project/")) {
      window.dispatchEvent(new CustomEvent("bg:logo:hideImmediate"));
    } else if (pathname === "/") {
      // トップは常に表示。ただし通常は“非イントロ”の表示イベント
      window.dispatchEvent(new CustomEvent("bg:logo:show"));
    } else {
      window.dispatchEvent(new CustomEvent("bg:logo:show"));
    }
  }, [pathname]);

  return null;
}
