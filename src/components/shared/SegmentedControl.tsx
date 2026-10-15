"use client";

import type { ReactNode } from "react";
import { cn } from "cn";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  "aria-label": string;
  className?: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  className,
  ...props
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={props["aria-label"]}
      className={cn("inline-flex rounded-[12px] bg-surface-muted p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-150 ease-out outline-none focus-visible:ring-3 focus-visible:ring-ring/40 [&_svg]:size-4",
              active
                ? "bg-surface text-ink shadow-segment"
                : "text-muted-foreground hover:text-ink",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
