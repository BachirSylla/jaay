import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { RetryButton } from "@/components/layout/RetryButton";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.offline.title, robots: { index: false } };

/** Static page cached by the service worker, shown when a navigation fails offline. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo size={48} />
      <span className="grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
        <WifiOff aria-hidden="true" className="size-7" />
      </span>
      <h1 className="text-[28px]">{fr.offline.title}</h1>
      <p className="text-muted-foreground">{fr.offline.text}</p>
      <RetryButton />
    </main>
  );
}
