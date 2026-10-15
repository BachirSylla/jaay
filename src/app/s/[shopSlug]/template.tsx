"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

// A template re-mounts on every navigation (unlike a layout), which replays the entrance:
// fade + 8px rise, 200ms ease-out. Disabled with prefers-reduced-motion (MotionConfig).
export default function ShopTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {children}
    </motion.div>
  );
}
