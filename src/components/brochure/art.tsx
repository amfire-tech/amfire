"use client";

import { useId } from "react";
import { cx } from "../ui";

// Flat illustrations for the brochures: a shopper pushing a cart (amfire or a
// typical agency), the cover flame, and the super-mall. Pure SVG so they stay
// sharp, theme with currentColor where it matters and print well.

/** Spots for boxes in the cart basket, bottom row first. */
const BOX_SPOTS = [
  { x: 122, y: 118, w: 26, h: 22 },
  { x: 150, y: 114, w: 22, h: 26 },
  { x: 174, y: 120, w: 22, h: 20 },
  { x: 130, y: 96, w: 24, h: 22 },
  { x: 156, y: 92, w: 26, h: 22 },
  { x: 184, y: 98, w: 16, h: 22 },
  { x: 124, y: 74, w: 20, h: 22 },
  { x: 146, y: 70, w: 24, h: 22 },
  { x: 172, y: 76, w: 22, h: 22 },
  { x: 136, y: 50, w: 22, h: 20 },
  { x: 160, y: 48, w: 24, h: 22 },
  { x: 150, y: 28, w: 20, h: 20 },
];
export const CART_CAPACITY = BOX_SPOTS.length;

export function Shopper({
  boxes,
  tone,
  className,
  overflow,
}: {
  /** How many boxes are in the cart (0 to CART_CAPACITY). */
  boxes: number;
  tone: "amfire" | "rival";
  className?: string;
  /** Boxes spilling over the top: the "cart is full" moment. */
  overflow?: boolean;
}) {
  const gid = useId();
  const brand = tone === "amfire";
  const shirt = brand ? `url(#${gid}-shirt)` : "#9a9a9a";
  return (
    <svg viewBox="0 0 220 190" className={cx("w-full", className)} role="img" aria-label={brand ? "A shopper with an amfire cart" : "A shopper with another company's cart"}>
      <defs>
        <linearGradient id={`${gid}-shirt`} x1="0" x2="1">
          <stop offset="0" stopColor="#ff453a" />
          <stop offset="1" stopColor="#ff8747" />
        </linearGradient>
        <linearGradient id={`${gid}-box`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ff8747" />
          <stop offset="1" stopColor="#ff453a" />
        </linearGradient>
      </defs>
      {/* floor shadow */}
      <ellipse cx="120" cy="180" rx="96" ry="5" fill="#000" opacity="0.08" />
      {/* person */}
      <rect x="44" y="118" width="11" height="54" rx="5" fill="#4a4a4a" />
      <rect x="59" y="118" width="11" height="54" rx="5" fill="#4a4a4a" />
      <rect x="40" y="168" width="17" height="7" rx="3.5" fill="#262626" />
      <rect x="57" y="168" width="17" height="7" rx="3.5" fill="#262626" />
      <rect x="38" y="60" width="38" height="64" rx="16" fill={shirt} />
      <path d="M70 76 C 84 84, 94 88, 104 88" stroke="#c48a63" strokeWidth="9" strokeLinecap="round" fill="none" />
      <circle cx="57" cy="40" r="16" fill="#c48a63" />
      <path d="M41 38c0-11 8-17 17-17s16 6 15 15c-5-4-11-5-17-3-6 1-10 3-15 5z" fill="#1d1d1d" />
      {brand ? (
        <path d="M51 45c2.5 3 9.5 3 12 0" stroke="#5a3826" strokeWidth="2" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M51 47c2.5-2 9.5-2 12 0" stroke="#5a3826" strokeWidth="2" strokeLinecap="round" fill="none" />
      )}
      {/* boxes */}
      {BOX_SPOTS.map((b, i) => {
        const shown = i < boxes;
        return (
          <g
            key={i}
            style={{
              transform: shown ? "translateY(0) scale(1)" : "translateY(-40px) scale(0.6)",
              opacity: shown ? 1 : 0,
              transformOrigin: `${b.x + b.w / 2}px ${b.y + b.h}px`,
              transition: "transform 450ms cubic-bezier(.2,.9,.3,1.3), opacity 250ms",
            }}
          >
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="3" fill={brand ? `url(#${gid}-box)` : "#c9c9c9"} />
            <path d={`M${b.x} ${b.y + 7}h${b.w}`} stroke="#fff" strokeOpacity="0.45" strokeWidth="1.5" />
          </g>
        );
      })}
      {overflow && (
        <g className="motion-safe:animate-float">
          <rect x="108" y="10" width="18" height="16" rx="3" fill={`url(#${gid}-box)`} transform="rotate(-18 117 18)" />
          <rect x="190" y="18" width="16" height="16" rx="3" fill={`url(#${gid}-box)`} transform="rotate(14 198 26)" />
        </g>
      )}
      {/* cart */}
      <path d="M98 84 L110 90" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M110 90 H208 L198 142 H120 Z" fill={brand ? "#ff453a" : "#bdbdbd"} fillOpacity="0.12" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M115 106 H205 M118 124 H201 M135 90 L139 142 M160 90 L160 142 M185 90 L181 142" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.35" />
      <path d="M110 90 L122 152 H202" stroke="currentColor" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="132" cy="166" r="9" fill="#fff" stroke="currentColor" strokeWidth="3.5" />
      <circle cx="190" cy="166" r="9" fill="#fff" stroke="currentColor" strokeWidth="3.5" />
    </svg>
  );
}

export function Flame({ className }: { className?: string }) {
  const gid = useId();
  return (
    <svg viewBox="0 0 120 150" aria-hidden className={className}>
      <defs>
        <linearGradient id={`${gid}-f`} x1="0" x2="0" y1="1" y2="0">
          <stop offset="0" stopColor="#ff453a" />
          <stop offset="1" stopColor="#ffb36b" />
        </linearGradient>
      </defs>
      <path
        d="M60 6c6 26 34 40 34 78 0 30-18 58-34 58S26 114 26 84c0-18 9-28 15-36 1 12 6 20 13 22-4-22 0-46 6-64z"
        fill={`url(#${gid}-f)`}
        className="origin-bottom motion-safe:animate-flicker"
        style={{ transformBox: "fill-box" }}
      />
      <path d="M60 70c4 14 18 22 18 42 0 16-9 26-18 26s-18-10-18-26c0-10 5-16 8-20 1 7 4 10 7 11-2-12 0-24 3-33z" fill="#fff" opacity="0.85" />
    </svg>
  );
}

/** The super-mall: rows of lit shop fronts and shelves stretching away. */
export function Mall({ className }: { className?: string }) {
  const gid = useId();
  const shops = [0, 1, 2, 3, 4, 5];
  return (
    <svg viewBox="0 0 600 260" aria-hidden className={cx("w-full", className)} preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id={`${gid}-sky`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1a1a1a" />
          <stop offset="1" stopColor="#080808" />
        </linearGradient>
        <linearGradient id={`${gid}-glow`} x1="0" x2="1">
          <stop offset="0" stopColor="#ff453a" />
          <stop offset="1" stopColor="#ff8747" />
        </linearGradient>
      </defs>
      <rect width="600" height="260" fill={`url(#${gid}-sky)`} />
      {/* glass roof */}
      <path d="M0 40 L300 0 L600 40" stroke="#fff" strokeOpacity="0.12" strokeWidth="2" fill="none" />
      {[100, 200, 400, 500].map((x) => (
        <path key={x} d={`M${x} ${40 - Math.abs(300 - x) * (40 / 300)}V40`} stroke="#fff" strokeOpacity="0.08" />
      ))}
      {/* two floors of shops */}
      {[50, 140].map((y, floor) =>
        shops.map((i) => {
          const x = 20 + i * 96;
          return (
            <g key={`${floor}-${i}`}>
              <rect x={x} y={y} width="84" height="70" rx="4" fill="#141414" stroke="#fff" strokeOpacity="0.08" />
              <rect x={x} y={y} width="84" height="12" rx="3" fill={`url(#${gid}-glow)`} opacity={0.35 + ((i + floor) % 3) * 0.2} />
              {[0, 1, 2].map((s) => (
                <g key={s}>
                  <path d={`M${x + 8} ${y + 32 + s * 13}h68`} stroke="#fff" strokeOpacity="0.15" />
                  {[0, 1, 2, 3, 4].map((b) => (
                    <rect
                      key={b}
                      x={x + 10 + b * 13}
                      y={y + 22 + s * 13}
                      width="9"
                      height="9"
                      rx="1.5"
                      fill={(b + s + i) % 4 === 0 ? `url(#${gid}-glow)` : "#fff"}
                      opacity={(b + s + i) % 4 === 0 ? 0.9 : 0.18}
                    />
                  ))}
                </g>
              ))}
            </g>
          );
        }),
      )}
      {/* floor */}
      <rect y="226" width="600" height="34" fill="#0d0d0d" />
      <path d="M0 226 H600" stroke={`url(#${gid}-glow)`} strokeOpacity="0.6" strokeWidth="2" />
    </svg>
  );
}
