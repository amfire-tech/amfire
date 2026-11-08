"use client";

import { useEffect } from "react";
import { recordAssetOpenAction } from "../actions";

/** Reported once per page load, even when an effect runs twice. */
const reported = new Set<string>();

/** Reports the open, then forwards to the report. Never holds the visitor up for more than a moment. */
export function Forward({ token, target }: { token: string; target: string }) {
  useEffect(() => {
    if (reported.has(token)) return;
    reported.add(token);
    let gone = false;
    const go = () => {
      if (gone) return;
      gone = true;
      window.location.replace(target);
    };
    const timer = setTimeout(go, 1500);
    recordAssetOpenAction(token)
      .catch(() => {})
      .finally(() => {
        clearTimeout(timer);
        go();
      });
  }, [token, target]);
  return null;
}
