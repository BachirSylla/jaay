"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { ConnectionStatus } from "./ConnectionStatus";

/** App-wide client providers. reducedMotion="user" honours prefers-reduced-motion. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: "easeOut" }}>
      {children}
      <ConnectionStatus />
      <Toaster />
    </MotionConfig>
  );
}
