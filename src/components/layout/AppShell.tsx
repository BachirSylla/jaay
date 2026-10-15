"use client";

import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";

/** Shop space frame: sidebar (≥768px), bottom tab bar (<768px), centered content. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar />
      <div className="min-h-dvh md:pl-[76px] lg:pl-[248px]">
        <main className="mx-auto w-full max-w-[1600px] px-5 pt-6 pb-[calc(96px+env(safe-area-inset-bottom))] md:px-8 md:pb-10 lg:px-10 lg:pt-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </TooltipProvider>
  );
}
