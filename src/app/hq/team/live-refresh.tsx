"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Keeps the Revenue team page current without a socket: re-renders the
 * server page every few seconds while a task is queued or running, slowly
 * otherwise, and not at all while the tab is hidden.
 */
export function LiveRefresh({ busy }: { busy: boolean }) {
  const router = useRouter();
  useEffect(() => {
    const every = busy ? 3000 : 20000;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, every);
    return () => clearInterval(id);
  }, [busy, router]);
  return null;
}
