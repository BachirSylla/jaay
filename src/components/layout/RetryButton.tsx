"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fr } from "@/messages/fr";

/** The offline page is served at the requested address: retrying is a reload. */
export function RetryButton() {
  return (
    <Button size="lg" onClick={() => window.location.reload()}>
      <RotateCw data-icon="inline-start" aria-hidden="true" />
      {fr.offline.retry}
    </Button>
  );
}
