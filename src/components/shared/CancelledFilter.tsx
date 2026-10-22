"use client";

import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/i18n";
import { fr } from "@/messages/fr";

const t = fr.cancelledFilter;

/** "Show the cancelled ones (n)" switch; renders nothing when there is none to hide. */
export function CancelledToggle({
  count,
  shown,
  onShownChange,
}: {
  count: number;
  shown: boolean;
  onShownChange: (shown: boolean) => void;
}) {
  if (count === 0) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-pressed={shown}
      onClick={() => onShownChange(!shown)}
      className="self-start text-muted-foreground"
    >
      {shown ? (
        <EyeOff data-icon="inline-start" aria-hidden="true" />
      ) : (
        <Eye data-icon="inline-start" aria-hidden="true" />
      )}
      {shown ? t.hide : fill(t.show, { n: count })}
    </Button>
  );
}

/**
 * Wraps a server-rendered list: rows marked `data-cancelled` are hidden until the user asks
 * for them (rule in globals.css). Cancelled operations are never deleted, only kept out of sight.
 */
export function HideCancelled({
  count,
  total,
  children,
}: {
  count: number;
  total: number;
  children: ReactNode;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex flex-col gap-2" data-show-cancelled={shown}>
      <CancelledToggle count={count} shown={shown} onShownChange={setShown} />
      {!shown && count > 0 && count === total ? <AllHidden /> : children}
    </div>
  );
}

export function AllHidden() {
  return <p className="py-6 text-center text-muted-foreground">{t.allHidden}</p>;
}
