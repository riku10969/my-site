"use client";
import { useEffect } from "react";
import { motion, useAnimationControls } from "framer-motion";

/**
 * MintGridLoader
 *  - Full-screen loading overlay inspired by tiled/checker fade seen in Nael Messaoudene's site vibe
 *  - Tiles sweep in a staggered pattern, 
 *  - Center text shows "LOADING" (customizable)
 *  - When `reveal` becomes true, tiles slide away and the overlay fades out
 *
 * Props
 *  - rows, cols: grid density
 *  - tileOpacity: 0..1 darkness of each tile
 *  - bg: background color (mint-like by default)
 *  - tileColor: base tile color; usually black with alpha
 *  - text: center label
 *  - loop: whether to loop the sweep while waiting
 *  - speed: seconds for one sweep cycle
 *  - reveal: set to true to exit (uncover the page)
 *  - onFinish: callback after exit completes
 */

type Props = {
  rows?: number;
  cols?: number;
  tileOpacity?: number;
  bg?: string;
  tileColor?: string;
  text?: string;
  loop?: boolean;
  speed?: number; // seconds for a single in/out pass
  reveal?: boolean;
  onFinish?: () => void;
};

export default function MintGridLoader({
  rows = 6,
  cols = 8,
  tileOpacity = 0.28,
  bg = "#DFF0C1", // soft mint
  tileColor = "#000000",
  text = "LOADING",
  loop = true,
  speed = 1.6,
  reveal = false,
  onFinish,
}: Props) {
  const tiles = Array.from({ length: rows * cols }, (_, i) => i);
  const controls = useAnimationControls();
  const revealControls = useAnimationControls();

  // Sweep animation (loop while waiting)
  useEffect(() => {
    const run = async () => {
      // Rise tiles (checker stagger)
      await controls.start(i => ({
        y: ["100%", "0%"],
        opacity: [0, tileOpacity],
        transition: {
          duration: speed * 0.55,
          ease: [0.22, 1, 0.36, 1],
          delay: ((i % cols) + Math.floor(i / cols)) * (speed / (rows + cols) / 1.8),
        },
      }));
      // Fade them a bit for a soft hold
      await controls.start({ opacity: tileOpacity * 0.85, transition: { duration: speed * 0.15 } });
      // Fall tiles
      await controls.start(i => ({
        y: ["0%", "-100%"],
        opacity: [tileOpacity, 0],
        transition: {
          duration: speed * 0.55,
          ease: [0.65, 0, 0.35, 1],
          delay: ((i % cols) + Math.floor(i / cols)) * (speed / (rows + cols) / 1.8),
        },
      }));
    };

    let mounted = true;
    const looper = async () => {
      while (mounted && loop && !reveal) {
        await run();
      }
    };

    looper();
    return () => {
      mounted = false;
    };
  }, [controls, cols, rows, loop, speed, tileOpacity, reveal]);

  // Exit / reveal animation
  useEffect(() => {
    if (!reveal) return;
    const exit = async () => {
      // Sweep one last time downward to unveil
      await revealControls.start(i => ({
        y: ["0%", "100%"],
        opacity: [tileOpacity, 0],
        transition: {
          duration: speed * 0.6,
          ease: [0.22, 1, 0.36, 1],
          delay: ((i % cols) + Math.floor(i / cols)) * (speed / (rows + cols) / 1.6),
        },
      }));
      onFinish?.();
    };
    exit();
  }, [reveal, revealControls, cols, rows, speed, tileOpacity, onFinish]);

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{ background: bg }}
      aria-label="Page loading"
      role="status"
    >
      {/* Tiles */}
      <div
        className="absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
      >
        {tiles.map((i) => (
          <motion.div
            key={i}
            custom={i}
            initial={{ y: "100%", opacity: 0 }}
            animate={reveal ? revealControls : controls}
            className="[transform:translateZ(0)]"
            style={{
              backgroundColor: tileColor,
              opacity: tileOpacity,
              mixBlendMode: "multiply",
            }}
          />
        ))}
      </div>

      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="tracking-[0.2em] text-center select-none"
          style={{
            fontWeight: 800,
            letterSpacing: "0.14em",
            fontSize: "min(9vw, 44px)",
            color: "#121212",
            textShadow: "0 1px 0 rgba(255,255,255,0.35)",
          }}
        >
          {text}
        </motion.div>
      </div>
    </div>
  );
}

/* =====================
   Usage Example (Next.js)
   ---------------------
   import MintGridLoader from "@/components/MintGridLoader";

   export default function Page() {
     const [ready, setReady] = useState(false);
     useEffect(() => {
       const t = setTimeout(() => setReady(true), 2500); // fake load
       return () => clearTimeout(t);
     }, []);
     return (
       <main className="relative min-h-screen">
         {!ready && <MintGridLoader text="LOADING" />}
         {ready && <YourActualContent/>}
       </main>
     );
   }

   // To play exit animation when data is ready:
   const [reveal, setReveal] = useState(false);
   <MintGridLoader reveal={reveal} onFinish={() => setShow(false)} />
   setReveal(true) when your data resolves.
===================== */
