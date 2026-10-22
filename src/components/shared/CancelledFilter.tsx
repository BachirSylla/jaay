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

export type ListRow = { key: string; cancelled: boolean; className?: string; node: ReactNode };

/**
 * A list whose rows are rendered on the server: cancelled rows stay out of sight until the
 * user asks for them. Cancelled operations are never deleted, only hidden from the list.
 */
export function HideCancelled({ rows, className }: { rows: ListRow[]; className: string }) {
  const [shown, setShown] = useState(false);
  const listed = shown ? rows : rows.filter((row) => !row.cancelled);
  return (
    <div className="flex flex-col gap-2">
      <CancelledToggle
        count={rows.length - rows.filter((row) => !row.cancelled).length}
        shown={shown}
        onShownChange={setShown}
      />
      {listed.length === 0 ? (
        <AllHidden />
      ) : (
        <ul className={className}>
          {listed.map((row) => (
            <li key={row.key} className={row.className}>
              {row.node}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AllHidden() {
  return <p className="py-6 text-center text-muted-foreground">{t.allHidden}</p>;
}
