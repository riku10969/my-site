"use client";

import styles from "../styles/Top.module.css";
import { useRef, useEffect } from "react";
import { initWebGLScene } from "./canvas/WebGLScene";

export default function Top() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      initWebGLScene(canvasRef.current);
    }
  }, []);

  return (
    <section className={styles.top}>
      <div className="bgHost">
      <canvas ref={canvasRef} className={styles.canvas}></canvas>
      </div>
    </section>
  );
}
