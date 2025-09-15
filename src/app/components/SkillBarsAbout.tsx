"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../styles/SkillBars.module.css";
import GlitchText from "./GlitchText";

type Skill = { label: string; blocks: number }; // 0..5
type Group = {
  name: string;
  panelColor: string;
  edgeColor: string;
  barColor: string;
  textColor: string;
  valueColor: string;
  skills: Skill[];
};

const GROUPS: Group[] = [
  {
    name: "Front",
    panelColor: "#5a37a6",
    edgeColor: "#2ccdb9",
    barColor: "#11a98b",
    textColor: "#e8f1ef",
    valueColor: "#e8f1ef",
    skills: [
      { label: "HTML", blocks: 5 },
      { label: "CSS", blocks: 4 },
      { label: "JS", blocks: 4 },
      { label: "TS", blocks: 3 },
      { label: "Next.js", blocks: 3 },
    ],
  },
  {
    name: "Backend",
    panelColor: "#119d8e",
    edgeColor: "#5a37a6",
    barColor: "#5a37a6",
    textColor: "#e8f1ef",
    valueColor: "#e8f1ef",
    skills: [
      { label: "PHP", blocks: 2 },
      { label: "Laravel", blocks: 2 },
      { label: "AWS", blocks: 2 },
    ],
  },
  {
    name: "Design",
    panelColor: "#C42F19",
    edgeColor: "#EBE322",
    barColor: "#EBE322",
    textColor: "#e8f1ef",
    valueColor: "#e8f1ef",
    skills: [
      { label: "Figma", blocks: 4 },
      { label: "Illustrator", blocks: 5},
      { label: "Photoshop", blocks: 3},
      { label: "XD", blocks: 3}
    ],
  },
  {
    name: "Tool",
    panelColor: "#EBE322",
    edgeColor: "#C42F19",
    barColor: "#C42F19",
    textColor: "#000000",
    valueColor: "#000000",
    skills: [
      { label: "Git", blocks: 5 },
      { label: "VBA", blocks: 5 }
    ],
  },
];

function Cell({
  filled,
  delayMs,
  restartKey,
}: {
  filled: boolean;
  delayMs: number;
  restartKey: number;
}) {
  const [play, setPlay] = useState(false);
  useEffect(() => {
    setPlay(false);
    const id = requestAnimationFrame(() => setPlay(true));
    return () => cancelAnimationFrame(id);
  }, [restartKey]);

  return (
    <div className={styles.cell}>
      {filled ? (
        <span
          className={`${styles.cellFill} ${play ? styles.cellPlay : ""}`}
          style={{ transitionDelay: `${delayMs}ms` }}
        />
      ) : (
        <span className={styles.cellEmpty} />
      )}
    </div>
  );
}

export default function SkillBarsAbout({
  title = "Skill",
  perCellDelayMs = 80, // 1コマずつ点灯させる間隔
}: {
  title?: string;
  perCellDelayMs?: number;
}) {
  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    setRestartKey((k) => k + 1);
  }, [active]);

  const theme = GROUPS[active];
  const cssVars: React.CSSProperties = {
    ["--panel" as any]: theme.panelColor,
    ["--panelEdge" as any]: theme.edgeColor,
    ["--bar" as any]: theme.barColor,
    ["--textColor" as any]: theme.textColor,
    ["--valueColor" as any]: theme.valueColor,
  };

  const rows = useMemo(
  () =>
    theme.skills.map((s, rowIndex) => {
      const cells = Array.from({ length: 5 }, (_, i) => i < s.blocks);
      return (
        <div className={styles.row} key={s.label}>
          {/* ← ラベルをグリッチ化（行ごとに少し遅延、ホバーで再生） */}
          <GlitchText
            as="span"
            text={s.label}
            className={styles.label}
            delaySec={rowIndex * 0.06}
            replayOnHover
          />

          <div className={styles.track5} aria-hidden="true">
            {cells.map((filled, i) =>
              seen ? (
                <Cell
                  key={i}
                  filled={filled}
                  delayMs={i * perCellDelayMs}
                  restartKey={restartKey}
                />
              ) : (
                <div key={i} className={styles.cell} />
              )
            )}
          </div>

          {/* 数値にも掛けたいなら下をアンコメント */}
          <GlitchText as="span" text={`${s.blocks}/5`} className={styles.value} delaySec={rowIndex*0.06+0.1} replayOnHover />
        </div>
      );
    }),
  [theme, seen, perCellDelayMs, restartKey]
);

  return (
    <section className={styles.wrap} ref={ref}>
      <h3 className={styles.h3}>
        <GlitchText 
        as="span" text={title} trigger="scroll"/>
      </h3>

      <div className={styles.tabs} role="tablist" aria-label="Skill groups">
  {GROUPS.map((g, i) => (
    <button
      key={g.name}
      type="button"
      role="tab"
      aria-selected={i === active}
      className={`${styles.tab} ${i === active ? styles.active : ""}`}
      onClick={() => setActive(i)}
    >
      {i === active ? (
        <GlitchText as="span" text={g.name} />
      ) : (
        <span>{g.name}</span>
      )}
    </button>
  ))}
</div>

      <div className={styles.panel} style={cssVars}>
        {rows}
      </div>
    </section>
  );
}
