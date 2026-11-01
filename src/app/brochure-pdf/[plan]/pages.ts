import { cx } from "@/components/ui";

// A4 page shells for the brochure PDFs. Gradient-clipped text prints as an
// outlined box, so pages use solid brand colours.
export const PAGE = "relative mx-auto flex h-[297mm] w-[210mm] flex-col overflow-hidden p-[14mm] shadow-xl break-after-page print:shadow-none";
export const LIGHT = cx(PAGE, "bg-white text-ink");
