"use client";

import styles from "../../styles/Top.module.css";
import { useRef, useEffect } from "react";
import { initWebGLScene } from "../webgl/WebGLScene";

export default function TopSection() {
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
