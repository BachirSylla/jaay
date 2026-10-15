"use client";

import { useSyncExternalStore } from "react";
import { readThemePreference, subscribeTheme, type ThemePreference } from "@/lib/theme";

/** Current theme preference, kept in sync with ThemeToggle and the OS setting. */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore<ThemePreference>(subscribeTheme, readThemePreference, () => "system");
}
