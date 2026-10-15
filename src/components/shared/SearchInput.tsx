"use client";

import type { ComponentProps } from "react";
import { Search, X } from "lucide-react";
import { cn } from "cn";
import { fr } from "@/messages/fr";

type SearchInputProps = Omit<ComponentProps<"input">, "onChange" | "value" | "type"> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function SearchInput({ value, onValueChange, className, ...props }: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-subtle"
      />
      <input
        type="search"
        enterKeyHint="search"
        aria-label={props["aria-label"] ?? fr.common.search}
        placeholder={fr.common.search}
        {...props}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="h-12 w-full rounded-lg border border-line bg-surface pr-11 pl-11 text-base text-ink outline-none placeholder:text-subtle focus-visible:border-[1.5px] focus-visible:border-cognac focus-visible:bg-cognac-soft [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label={fr.common.clearSearch}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-subtle hover:text-ink"
        >
          <X aria-hidden="true" className="size-[18px]" />
        </button>
      ) : null}
    </div>
  );
}

/** Case- and accent-insensitive match ("élé" matches "Élégance"). */
export function matchesSearch(text: string, query: string): boolean {
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return normalize(text).includes(normalize(query.trim()));
}
