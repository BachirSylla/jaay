"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useThemePreference } from "@/lib/use-theme-preference";

// Theme comes from Jaay's own theme store (no next-themes).
function Toaster(props: ToasterProps) {
  const theme = useThemePreference();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="top-center"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4 text-danger" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--line)",
          "--border-radius": "14px",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "cn-toast font-sans" } }}
      {...props}
    />
  );
}

export { Toaster };
