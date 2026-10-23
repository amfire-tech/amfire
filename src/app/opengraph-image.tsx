import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The preview card shown when a page is shared on WhatsApp, LinkedIn or X.

export const alt = "AMFIRE — software, automation and a tech team for Indian businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SERVICES = [
  { name: "Build", line: "Software for your problem" },
  { name: "Operate", line: "Your tech team, no hiring" },
  { name: "Automate", line: "WhatsApp → Tally, GST, reminders" },
];

export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public/brand/amfire-logo-inverse.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 64px", background: "#080808", color: "#ffffff", position: "relative" }}>
        <div style={{ position: "absolute", top: -220, right: -180, width: 640, height: 640, borderRadius: 9999, background: "radial-gradient(circle, rgba(255,69,58,0.55), rgba(255,135,71,0) 70%)" }} />
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
        <img src={logoSrc} width={222} height={60} alt="" />
        <div style={{ display: "flex", flexDirection: "column", fontSize: 58, lineHeight: 1.1, letterSpacing: -1.5 }}>
          <div>Build what&apos;s missing.</div>
          <div>Run what matters.</div>
          <div style={{ color: "#ff453a" }}>Automate the rest.</div>
          <div style={{ marginTop: 18, fontSize: 26, letterSpacing: 0, color: "rgba(255,255,255,0.7)" }}>Technology partner for Indian businesses</div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {SERVICES.map((s) => (
            <div key={s.name} style={{ display: "flex", flexDirection: "column", flex: 1, padding: "18px 22px", borderRadius: 20, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#ff8747" }}>{s.name}</div>
              <div style={{ marginTop: 4, fontSize: 22, color: "rgba(255,255,255,0.8)" }}>{s.line}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
