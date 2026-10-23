"use client";

import { useEffect, useRef, useState } from "react";
import { Button, cx } from "@/components/ui";
import { DemoFrame } from "./demo-frame";

// Sample data only. Fabric attracts 5% GST.
const LINES = [
  { design: "4521", name: "Rayon print", qty: 40, rate: 2150, stock: 112 },
  { design: "3307 Blue", name: "Cotton slub", qty: 25, rate: 1780, stock: 31 },
];
const TAXABLE = LINES.reduce((s, l) => s + l.qty * l.rate, 0);
const GST = Math.round(TAXABLE * 0.05);
const TOTAL = TAXABLE + GST;
const OUTSTANDING = 385000;
const LIMIT = 500000;
const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const STEPS = [
  { title: "Order arrives on WhatsApp", detail: "Typed exactly as the retailer always does" },
  { title: "Read into line items", detail: "Design, quantity and rate extracted" },
  { title: "Check stock and credit", detail: "Live from TallyPrime" },
  { title: "Owner approves", detail: "Credit limit exceeded — a person decides", human: true },
  { title: "Post to Tally + e-invoice", detail: "Sales voucher, IRN and e-way bill" },
  { title: "Confirm to retailer", detail: "WhatsApp reply with a UPI link" },
];

export function AutomateDemo() {
  const [step, setStep] = useState(0);
  const [approved, setApproved] = useState(false);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const waitingForApproval = step === 3 && !approved;
  const done = step === STEPS.length - 1;

  useEffect(() => {
    if (!playing || waitingForApproval || done) return;
    timer.current = setTimeout(() => setStep((s) => s + 1), 1300);
    return () => clearTimeout(timer.current);
  }, [playing, step, waitingForApproval, done]);

  function restart() {
    clearTimeout(timer.current);
    setStep(0);
    setApproved(false);
    setPlaying(false);
  }

  return (
    <DemoFrame label="Automate demo · WhatsApp order to Tally" note="Sample data. No real customer or system is involved.">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* WhatsApp chat */}
        <div className="flex min-h-[360px] flex-col overflow-hidden rounded-2xl ring-1 ring-line">
          <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
            <span className="grid size-8 place-items-center rounded-full bg-white/20 text-sm font-semibold">PT</span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Patel Textiles</p>
              <p className="text-xs text-white/70">Retailer · Ahmedabad</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-2 bg-[#efe7dd] p-3 text-sm text-[#111] dark:bg-[#0b141a] dark:text-[#e9edef]">
            <div className="max-w-[85%] self-start rounded-xl rounded-tl-sm bg-white px-3 py-2 shadow-sm dark:bg-[#202c33]">
              Namaste 🙏 Order:
              <br />
              Design 4521 – 40 thaan
              <br />
              Design 3307 blue – 25 thaan
              <br />
              Rate same as last time. Kal tak dispatch karna.
              <span className="mt-1 block text-right text-[10px] opacity-60">10:38 AM</span>
            </div>
            {step >= 5 && (
              <div className="max-w-[85%] animate-rise self-end rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 shadow-sm dark:bg-[#005c4b]">
                Order confirmed ✅ SV-1187
                <br />
                {inr(TOTAL)} incl. GST · dispatch tomorrow by 11 AM.
                <br />
                <span className="font-medium underline">Pay by UPI →</span>
                <span className="mt-1 block text-right text-[10px] opacity-60">10:43 AM ✓✓</span>
              </div>
            )}
          </div>
        </div>

        {/* Workflow */}
        <div className="flex flex-col gap-3">
          <ol className="space-y-1.5" aria-label="Workflow steps">
            {STEPS.map((s, i) => {
              const state = i < step ? "done" : i === step ? "current" : "todo";
              return (
                <li
                  key={s.title}
                  aria-current={i === step ? "step" : undefined}
                  className={cx(
                    "flex items-start gap-3 rounded-xl px-3 py-2 transition",
                    i === step ? "bg-subtle ring-1 ring-line" : "",
                    state === "todo" && "opacity-45",
                  )}
                >
                  <span
                    aria-hidden
                    className={cx(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                      i < step ? "bg-brand text-ink" : i === step ? "bg-fg text-page" : "ring-1 ring-line",
                    )}
                  >
                    {i < step ? "✓" : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {s.title}
                      {s.human && <span className="ml-2 rounded-full bg-[#fff6ed] px-2 py-0.5 text-[10px] font-semibold text-[#9a3412] uppercase dark:bg-[#3a1d0a] dark:text-[#fdba74]">Human</span>}
                    </span>
                    <span className="block text-xs text-muted">{s.detail}</span>
                  </span>
                </li>
              );
            })}
          </ol>

          {/* Output panel */}
          <div className="min-h-[148px] rounded-xl bg-subtle p-4 text-sm ring-1 ring-line" aria-live="polite">
            {step === 0 && <p className="text-muted">Press “Next step” to follow the order through.</p>}
            {step === 1 && (
              <table className="w-full text-left text-xs">
                <thead className="text-muted">
                  <tr>
                    <th className="pb-1 font-medium">Design</th>
                    <th className="pb-1 font-medium">Qty</th>
                    <th className="pb-1 text-right font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {LINES.map((l) => (
                    <tr key={l.design} className="border-t border-line">
                      <td className="py-1.5">
                        {l.design} <span className="text-muted">· {l.name}</span>
                      </td>
                      <td>{l.qty} thaan</td>
                      <td className="text-right">{inr(l.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {step === 2 && (
              <div className="space-y-1.5">
                {LINES.map((l) => (
                  <p key={l.design}>
                    ✓ {l.design}: {l.stock} thaan in stock
                  </p>
                ))}
                <p className="font-medium text-danger">
                  ⚠ Outstanding after this order: {inr(OUTSTANDING + TOTAL)} — limit {inr(LIMIT)}
                </p>
              </div>
            )}
            {step === 3 &&
              (approved ? (
                <p>✓ Approved by owner at 10:42 AM. Logged with the order.</p>
              ) : (
                <div className="space-y-3">
                  <p>This order takes Patel Textiles over their credit limit by {inr(OUTSTANDING + TOTAL - LIMIT)}. Approve it?</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setApproved(true)}>
                      Approve order
                    </Button>
                    <Button size="sm" variant="secondary" onClick={restart}>
                      Hold
                    </Button>
                  </div>
                </div>
              ))}
            {step === 4 && (
              <div className="space-y-1">
                <p>✓ Sales voucher SV/1187 posted in TallyPrime</p>
                <p className="text-muted">
                  Taxable {inr(TAXABLE)} + GST 5% {inr(GST)} = <span className="font-medium text-fg">{inr(TOTAL)}</span>
                </p>
                <p>✓ E-invoice IRN generated · e-way bill created</p>
              </div>
            )}
            {step === 5 && (
              <p>
                ✓ Done. Nobody re-typed anything — staff only stepped in for the decision that needed a person.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {!done ? (
              <>
                <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={waitingForApproval}>
                  Next step
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setPlaying((p) => !p)} disabled={waitingForApproval}>
                  {playing ? "Pause" : "Play"}
                </Button>
              </>
            ) : null}
            <Button size="sm" variant="ghost" onClick={restart}>
              Restart
            </Button>
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}
