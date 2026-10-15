"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "cn";
import { fr } from "@/messages/fr";

type QuantityStepperProps = {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  className?: string;
};

/** − / value / + (DESIGN.md §6). The value can also be typed. */
export function QuantityStepper({
  value,
  onValueChange,
  min = 1,
  max = 10_000,
  label,
  className,
}: QuantityStepperProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex h-11 items-center rounded-lg bg-surface-muted p-0.5", className)}
    >
      <button
        type="button"
        onClick={() => onValueChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label={fr.stepper.decrease}
        className="grid size-10 place-items-center rounded-[10px] text-ink outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.94] disabled:opacity-35"
      >
        <Minus aria-hidden="true" className="size-4" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={value}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          if (digits) onValueChange(clamp(Number(digits)));
        }}
        onFocus={(event) => event.target.select()}
        className="w-11 bg-transparent text-center font-display text-lg font-bold tabular-nums outline-none"
      />
      <button
        type="button"
        onClick={() => onValueChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label={fr.stepper.increase}
        className="grid size-10 place-items-center rounded-[10px] bg-ink text-ground outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.94] disabled:opacity-35"
      >
        <Plus aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
