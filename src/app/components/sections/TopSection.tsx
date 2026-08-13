import styles from "../../styles/Top.module.css";

/**
 * トップの 100vh 分の場所取り。
 * 背景ノイズは画面全体に敷く BackgroundStage が唯一の描画担当なので、
 * ここでは WebGL コンテキストを持たない。
 */
export default function TopSection() {
  return <section className={styles.top} />;
}
