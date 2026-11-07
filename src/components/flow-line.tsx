// The signature drawing: how work moves through a company, from enquiry to
// payment, with the three places it usually gets stuck. Orange marks a stuck
// point and nothing else, here and across the site. The stuck points are general
// patterns we look for, not figures from a client.

const STAGES = ["Enquiry", "Quote", "Order", "Delivery", "Invoice", "Paid"];

/** Each stuck point sits between two stages (index of the stage before it). */
const STUCK = [
  { after: 0, label: "Reply waits in an inbox" },
  { after: 2, label: "Order typed in again" },
  { after: 4, label: "Payment chased at month end" },
];

const X0 = 40;
const STEP = 184;
const Y = 60;

export function FlowLine({ className }: { className?: string }) {
  return (
    <figure className={className}>
      {/* Wide screens (≥1024px, so labels render at 14px or more): one horizontal line. */}
      <svg
        viewBox="0 0 1000 160"
        className="hidden h-auto w-full lg:block"
        role="img"
        aria-label="Enquiry, quote, order, delivery, invoice, paid. Work usually gets stuck where a reply waits in an inbox, an order is typed in again, and a payment is chased at month end."
      >
        <line x1={X0} y1={Y} x2={X0 + STEP * 5} y2={Y} className="stroke-fg" strokeWidth="1.4" />
        {STAGES.map((s, i) => {
          const x = X0 + STEP * i;
          const last = i === STAGES.length - 1;
          return (
            <g key={s}>
              <circle cx={x} cy={Y} r={last ? 9 : 8} className={last ? "fill-fg" : "fill-page stroke-fg"} strokeWidth="1.4" />
              <text x={x} y={Y - 28} textAnchor="middle" fontSize="15" className={last ? "fill-fg font-medium" : "fill-muted"}>
                {s}
              </text>
            </g>
          );
        })}
        {STUCK.map((p) => {
          const x = X0 + STEP * p.after + STEP / 2;
          return (
            <g key={p.after}>
              <line x1={x} y1={Y} x2={x} y2={Y + 52} className="stroke-ember" strokeWidth="1.4" strokeDasharray="4 4" />
              <circle cx={x} cy={Y} r="5" className="fill-ember" />
              <text x={x} y={Y + 78} textAnchor="middle" fontSize="15" className="fill-fg">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Phones and tablets: the same path, top to bottom. */}
      <ol className="lg:hidden" aria-label="How work moves through a company">
        {STAGES.map((s, i) => {
          const stuck = STUCK.find((p) => p.after === i);
          const last = i === STAGES.length - 1;
          return (
            <li key={s} className="relative pl-9">
              <span aria-hidden className={`absolute top-[5px] left-0 size-3.5 rounded-full border-[1.5px] border-fg ${last ? "bg-fg" : "bg-page"}`} />
              {!last && <span aria-hidden className="absolute top-[19px] bottom-[-5px] left-[6.5px] w-[1.5px] bg-fg" />}
              <span className={`text-[15px] ${last ? "font-medium text-fg" : "text-muted"}`}>{s}</span>
              <div className={last ? "" : "pt-2 pb-4"}>
                {stuck && (
                  <p className="flex items-center gap-2.5 text-[15px] text-fg">
                    <span aria-hidden className="size-2 shrink-0 rounded-full bg-ember" />
                    {stuck.label}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <figcaption className="mt-6 border-t border-line pt-4 text-sm text-muted">Where work usually gets stuck.</figcaption>
    </figure>
  );
}
