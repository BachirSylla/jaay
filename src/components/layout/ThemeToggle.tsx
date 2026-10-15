"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { setThemePreference } from "@/lib/theme";
import { useThemePreference } from "@/lib/use-theme-preference";
import { fr } from "@/messages/fr";

const options = [
  { value: "light", label: fr.theme.light, icon: <Sun aria-hidden="true" /> },
  { value: "dark", label: fr.theme.dark, icon: <Moon aria-hidden="true" /> },
  { value: "system", label: fr.theme.system, icon: <Monitor aria-hidden="true" /> },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const preference = useThemePreference();

  return (
    <SegmentedControl
      aria-label={fr.theme.label}
      options={options}
      value={preference}
      onValueChange={setThemePreference}
      className={className}
    />
  );
}
