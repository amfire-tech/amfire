"use client";

import { useState } from "react";
import { Button, cx } from "@/components/ui";
import { DemoFrame } from "./demo-frame";

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const PRODUCTS = [
  { id: "bp", en: "Brake pad set — Splendor", hi: "ब्रेक पैड सेट — स्प्लेंडर", price: 420, stock: 1240 },
  { id: "cp", en: "Clutch plate — Pulsar 150", hi: "क्लच प्लेट — पल्सर 150", price: 685, stock: 86 },
  { id: "ck", en: "Chain sprocket kit — Activa", hi: "चेन स्प्रोकेट किट — एक्टिवा", price: 1150, stock: 0 },
];

const T = {
  en: { products: "Products", orders: "Orders", stock: "in stock", out: "Back in stock 28 Oct", credit: "Credit used", place: "Place order", empty: "Add items to start an order.", next: "Simulate next update", tier: "Gold dealer" },
  hi: { products: "उत्पाद", orders: "ऑर्डर", stock: "स्टॉक में", out: "28 अक्टूबर को उपलब्ध", credit: "क्रेडिट उपयोग", place: "ऑर्डर करें", empty: "ऑर्डर शुरू करने के लिए आइटम जोड़ें।", next: "अगला अपडेट देखें", tier: "गोल्ड डीलर" },
};

const TIMELINE = [
  { en: "Order placed", hi: "ऑर्डर दिया गया" },
  { en: "Approved by sales", hi: "बिक्री टीम द्वारा स्वीकृत" },
  { en: "Invoiced in Tally", hi: "टैली में इनवॉइस" },
  { en: "Dispatched · LR 45821, VRL Logistics", hi: "भेजा गया · LR 45821, VRL लॉजिस्टिक्स" },
  { en: "Delivered", hi: "डिलीवर हुआ" },
];

const CREDIT_USED = 182000;
const CREDIT_LIMIT = 300000;

export function BuildDemo() {
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [cart, setCart] = useState<Record<string, number>>({ bp: 20 });
  const [order, setOrder] = useState<{ total: number; stage: number } | null>(null);
  const t = T[lang];

  const total = PRODUCTS.reduce((s, p) => s + (cart[p.id] ?? 0) * p.price, 0);
  const used = CREDIT_USED + (order?.total ?? 0) + (order ? 0 : total);
  const pct = Math.min(100, Math.round((used / CREDIT_LIMIT) * 100));

  function change(id: string, delta: number) {
    setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + delta) }));
  }

  return (
    <DemoFrame label="Build demo · Dealer ordering app" note="Sample data. Prices, stock and dealers are illustrative.">
      <div className="mx-auto max-w-sm overflow-hidden rounded-[2rem] bg-page ring-8 ring-fg/90">
        {/* App bar */}
        <div className="bg-ink px-4 pt-4 pb-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Singh Auto Parts</p>
              <p className="text-xs text-white/60">Ludhiana · {t.tier}</p>
            </div>
            <button
              type="button"
              onClick={() => setLang((l) => (l === "en" ? "hi" : "en"))}
              className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium hover:bg-white/25"
              aria-label={lang === "en" ? "Switch to Hindi" : "Switch to English"}
            >
              {lang === "en" ? "हिंदी" : "English"}
            </button>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-white/70">
              <span>{t.credit}</span>
              <span>
                {inr(used)} / {inr(CREDIT_LIMIT)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className={cx("h-full rounded-full transition-[width] duration-500", pct > 90 ? "bg-signal" : "bg-brand")} style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div role="tablist" className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-white/10 p-1 text-xs font-medium">
            {(["products", "orders"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cx("rounded-full py-1.5", tab === k ? "bg-white text-ink" : "text-white/80")}
              >
                {t[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[300px] p-3" aria-live="polite">
          {tab === "products" ? (
            <div className="space-y-2">
              {PRODUCTS.map((p) => (
                <div key={p.id} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{p[lang]}</p>
                      <p className={cx("text-xs", p.stock ? "text-success" : "text-danger")}>{p.stock ? `${p.stock.toLocaleString("en-IN")} ${t.stock}` : t.out}</p>
                    </div>
                    <p className="text-sm font-semibold">{inr(p.price)}</p>
                  </div>
                  {p.stock > 0 && (
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button type="button" aria-label={`Fewer ${p.en}`} onClick={() => change(p.id, -10)} className="size-7 rounded-full ring-1 ring-line hover:bg-subtle">
                        −
                      </button>
                      <span className="w-8 text-center text-sm tabular-nums">{cart[p.id] ?? 0}</span>
                      <button type="button" aria-label={`More ${p.en}`} onClick={() => change(p.id, 10)} className="size-7 rounded-full ring-1 ring-line hover:bg-subtle">
                        +
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-sm font-semibold">{total ? inr(total) : <span className="font-normal text-muted">{t.empty}</span>}</span>
                <Button
                  size="sm"
                  disabled={!total}
                  onClick={() => {
                    setOrder({ total, stage: 0 });
                    setCart({});
                    setTab("orders");
                  }}
                >
                  {t.place}
                </Button>
              </div>
            </div>
          ) : order ? (
            <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold">#SO-2291</p>
                <p className="text-sm">{inr(order.total)}</p>
              </div>
              <ol className="mt-3 space-y-3">
                {TIMELINE.map((s, i) => (
                  <li key={s.en} className={cx("flex gap-3 text-sm", i > order.stage && "opacity-40")}>
                    <span aria-hidden className={cx("mt-1 size-2.5 shrink-0 rounded-full", i <= order.stage ? "bg-brand" : "bg-line")} />
                    <span>{s[lang]}</span>
                  </li>
                ))}
              </ol>
              {order.stage < TIMELINE.length - 1 && (
                <Button size="sm" variant="secondary" className="mt-4 w-full" onClick={() => setOrder({ ...order, stage: order.stage + 1 })}>
                  {t.next}
                </Button>
              )}
            </div>
          ) : (
            <p className="p-4 text-center text-sm text-muted">{t.empty}</p>
          )}
        </div>
      </div>
    </DemoFrame>
  );
}
