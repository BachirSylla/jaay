"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { applyThemePreference, readThemePreference, type ThemePreference } from "@/lib/theme";
import { fr } from "@/messages/fr";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (readThemePreference() === "system") applyThemePreference("system");
  };
  media.addEventListener("change", onSystemChange);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onSystemChange);
  };
}

const options = [
  { value: "light", label: fr.theme.light, icon: <Sun aria-hidden="true" /> },
  { value: "dark", label: fr.theme.dark, icon: <Moon aria-hidden="true" /> },
  { value: "system", label: fr.theme.system, icon: <Monitor aria-hidden="true" /> },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const preference = useSyncExternalStore<ThemePreference>(
    subscribe,
    readThemePreference,
    () => "system",
  );

  return (
    <SegmentedControl
      aria-label={fr.theme.label}
      options={options}
      value={preference}
      onValueChange={(next) => {
        applyThemePreference(next);
        listeners.forEach((listener) => listener());
      }}
      className={className}
    />
  );
}
