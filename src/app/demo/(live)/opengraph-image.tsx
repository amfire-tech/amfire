import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The preview card when amfire.in/demo is shared on WhatsApp, LinkedIn or email:
// it should look like the product it opens, not like a brochure.

export const alt = "amfire live demo: a company run by agents, on one screen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TILES = [
  { label: "Revenue, month to date", value: "$1.38M", sub: "on pace for $3.42M", tone: "#3ccf8e" },
  { label: "On time in full", value: "96.4%", sub: "target 95%", tone: "#3ccf8e" },
  { label: "Days to get paid", value: "34", sub: "was 52", tone: "#3ccf8e" },
  { label: "Decisions for you", value: "4", sub: "everything else handled", tone: "#f5b54a" },
];

export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public/brand/amfire-logo-inverse.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "56px 64px", background: "#0b0b0c", color: "#ededea" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
          <img src={logoSrc} width={186} height={50} alt="" />
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, color: "#3ccf8e" }}>
            <div style={{ width: 12, height: 12, borderRadius: 999, background: "#3ccf8e" }} />
            Live demo
          </div>
        </div>
        <div style={{ marginTop: 52, fontSize: 64, lineHeight: 1.05, letterSpacing: -2.2, maxWidth: 980 }}>See a company run by agents.</div>
        <div style={{ marginTop: 16, fontSize: 26, color: "rgba(237,237,234,0.6)" }}>Every department on one screen. You approve only what matters.</div>
        <div style={{ marginTop: "auto", display: "flex", gap: 16 }}>
          {TILES.map((t) => (
            <div key={t.label} style={{ flex: 1, display: "flex", flexDirection: "column", padding: "18px 20px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.09)", background: "#141417" }}>
              <div style={{ fontSize: 17, color: "#8b8b92" }}>{t.label}</div>
              <div style={{ marginTop: 8, fontSize: 40, letterSpacing: -1 }}>{t.value}</div>
              <div style={{ marginTop: 4, fontSize: 16, color: t.tone }}>{t.sub}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
