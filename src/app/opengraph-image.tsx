import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The preview card shown when a page is shared on WhatsApp, LinkedIn or X.

export const alt = "amfire, operations engineering: a company that runs without you chasing it";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STAGES = ["Enquiry", "Quote", "Order", "Delivery", "Invoice", "Paid"];
/** Orange marks where work usually gets stuck (after these stages), as on the homepage drawing. */
const STUCK_AFTER = [0, 2, 4];

export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public/brand/amfire-logo-inverse.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "#0b0b0c", color: "#f2f1ed" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
        <img src={logoSrc} width={204} height={55} alt="" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 22, letterSpacing: 4, color: "rgba(242,241,237,0.5)" }}>OPERATIONS ENGINEERING</div>
          <div style={{ marginTop: 22, fontSize: 68, lineHeight: 1.04, letterSpacing: -2.5, maxWidth: 900 }}>A company that runs without you chasing it.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 0, borderTop: "1px solid rgba(242,241,237,0.18)", paddingTop: 26 }}>
          {STAGES.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", fontSize: 22, color: i === STAGES.length - 1 ? "#f2f1ed" : "rgba(242,241,237,0.55)" }}>
              {s}
              {i < STAGES.length - 1 && <div style={{ width: 56, height: 1, margin: "0 18px", background: STUCK_AFTER.includes(i) ? "#e8482a" : "rgba(242,241,237,0.3)" }} />}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
