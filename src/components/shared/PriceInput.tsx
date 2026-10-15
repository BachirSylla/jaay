"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "cn";
import { formatAmountInput, MAX_AMOUNT, parseAmount } from "@/lib/amount";

type PriceInputProps = Omit<ComponentProps<"input">, "value" | "onChange" | "type" | "size"> & {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
  /** Hint shown next to the field ("Conseillé 8 000 F"). */
  hint?: ReactNode;
  hintTone?: "default" | "danger";
  size?: "md" | "lg";
};

/**
 * Amount field in integer FCFA: numeric keypad, thousands grouped while typing,
 * "F" suffix in cognac (DESIGN.md §6).
 */
export function PriceInput({
  value,
  onValueChange,
  hint,
  hintTone = "default",
  size = "md",
  className,
  ...props
}: PriceInputProps) {
  // Keep what the user typed while focused; show the formatted value otherwise.
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? formatAmountInput(value);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <input
          {...props}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={display}
          onFocus={(event) => {
            setDraft(formatAmountInput(value));
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setDraft(null);
            props.onBlur?.(event);
          }}
          onChange={(event) => {
            const parsed = parseAmount(event.target.value);
            const next = parsed === null ? null : Math.min(parsed, MAX_AMOUNT);
            setDraft(formatAmountInput(next));
            onValueChange(next);
          }}
          className={cn(
            "w-full min-w-0 rounded-lg border border-line bg-surface pr-10 pl-3.5 font-display font-bold text-ink tabular-nums transition-[border-color,background-color] duration-150 ease-out outline-none placeholder:font-sans placeholder:font-normal placeholder:text-subtle focus-visible:border-[1.5px] focus-visible:border-cognac focus-visible:bg-cognac-soft aria-invalid:border-destructive",
            size === "lg" ? "h-14 text-[22px]" : "h-12 text-lg",
            className,
          )}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3.5 grid place-items-center font-display font-bold text-cognac"
        >
          F
        </span>
      </div>
      {hint ? (
        <span
          className={cn(
            "text-[13px] font-medium",
            hintTone === "danger" ? "text-danger" : "text-muted-foreground",
          )}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}
