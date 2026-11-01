"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Opens the browser's "Save as PDF" dialog once the page has loaded, and on demand. */
export function PrintButton({ plan }: { plan: string }) {
  useEffect(() => {
    track("brochure_pdf", { plan });
    // Give fonts and images a moment so the PDF matches the screen.
    const t = setTimeout(() => window.print(), 900);
    return () => clearTimeout(t);
  }, [plan]);
  return (
    <button type="button" onClick={() => window.print()} className="bg-brand rounded-full px-5 py-2.5 text-sm font-semibold text-ink">
      Save as PDF
    </button>
  );
}
