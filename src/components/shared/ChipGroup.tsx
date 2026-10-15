"use client";

import { cn } from "cn";

export type Chip<T extends string> = { value: T; label: string; count?: number };

type ChipGroupProps<T extends string> = {
  chips: readonly Chip<T>[];
  value: T;
  onValueChange: (value: T) => void;
  "aria-label": string;
  className?: string;
};

/** Filter pills (DESIGN.md §6): 34px tall, active = ink background. Scrolls on phones. */
export function ChipGroup<T extends string>({
  chips,
  value,
  onValueChange,
  className,
  ...props
}: ChipGroupProps<T>) {
  return (
    <div
      role="group"
      aria-label={props["aria-label"]}
      className={cn(
        "-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0",
        className,
      )}
    >
      {chips.map((chip) => {
        const active = chip.value === value;
        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={active}
            onClick={() => onValueChange(chip.value)}
            className={cn(
              "relative inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
              // Extends the touch target to 44px without changing the visual size.
              "after:absolute after:inset-x-0 after:-inset-y-[5px]",
              active
                ? "bg-ink text-ground"
                : "border border-line bg-surface text-ink hover:bg-surface-muted",
            )}
          >
            {chip.label}
            {chip.count !== undefined ? (
              <span className={cn("tabular-nums", active ? "opacity-70" : "text-muted-foreground")}>
                {chip.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
