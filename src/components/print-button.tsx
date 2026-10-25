"use client";

import { Button } from "./ui";

/** Opens the browser's print dialog, where "Save as PDF" gives a PDF of the page. */
export function PrintButton({ label = "Download PDF" }: { label?: string }) {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => window.print()} className="print:hidden">
      {label}
    </Button>
  );
}
