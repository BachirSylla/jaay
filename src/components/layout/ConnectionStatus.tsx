"use client";

import { useEffect, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { fr } from "@/messages/fr";

function subscribe(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

/** Banner while the device is offline (forms keep their content), toast when back online. */
export function ConnectionStatus() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  useEffect(() => {
    const back = () => toast.success(fr.offline.back);
    window.addEventListener("online", back);
    return () => window.removeEventListener("online", back);
  }, []);

  // Registers the service worker (production only: it would cache dev pages).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Without a service worker the app still works online.
    });
  }, []);

  return (
    <AnimatePresence>
      {online ? null : (
        <motion.div
          role="status"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-danger px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 text-sm font-semibold text-white"
        >
          <WifiOff aria-hidden="true" className="size-4" />
          {fr.offline.banner}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
