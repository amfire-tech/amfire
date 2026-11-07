import { cx } from "./ui";

/**
 * The closing invitation's living background: three soft ember shapes drifting very
 * slowly behind fine film grain, like firelight moving on a dark wall. It sits on the
 * right, behind the button; the left, where the words are, stays clean black. The
 * band's bottom edge fades back to black so it meets the footer without a seam.
 *
 * Rules: dark closing bands and the homepage hero (light variant) only, never behind
 * body text in the dark version, motion slow enough to feel
 * still at a glance (22–36 s loops), and frozen for visitors who prefer reduced motion
 * (see the media query in globals.css). Pure CSS: transforms only, no image files.
 *
 * `variant="light"` is the quieter version for the homepage hero on paper: a faint warm
 * wash behind the headline with fine dark grain, so the page is textured, never flat.
 *
 * Place it as the first child of a `relative isolate overflow-hidden` section.
 */
export function EmberField({ variant = "dark", className }: { variant?: "dark" | "light"; className?: string }) {
  return (
    <div aria-hidden className={cx("ember-field pointer-events-none absolute inset-0 -z-10", variant === "light" && "ember-field-light", className)}>
      <span className="ember-shape ember-shape-core" />
      <span className="ember-shape ember-shape-flame" />
      <span className="ember-shape ember-shape-light" />
      <span className="ember-grain" />
    </div>
  );
}
