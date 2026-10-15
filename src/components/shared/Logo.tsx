import { cn } from "cn";
import { fr } from "@/messages/fr";

/** "J" in gold on an espresso tile, optionally followed by the app name. */
export function Logo({
  size = 36,
  withName = false,
  className,
}: {
  size?: number;
  withName?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        style={{ width: size, height: size, fontSize: size * 0.56 }}
        className="grid shrink-0 place-items-center rounded-[30%] bg-espresso font-display leading-none font-bold text-gold ring-1 ring-gold/15"
      >
        J
      </span>
      {withName ? (
        <span className="font-display text-xl font-bold tracking-tight">{fr.app.name}</span>
      ) : (
        <span className="sr-only">{fr.app.name}</span>
      )}
    </span>
  );
}
