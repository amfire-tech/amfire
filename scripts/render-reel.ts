// Renders the "How it works" demo reel (src/components/reel/reel.tsx) to
// public/media/client-journey.mp4 and its poster, and stamps a content hash
// into src/knowledge/journey.json so browsers fetch the new video, not a cached one.
//
// The reel is drawn in code and every frame is a pure function of time, so
// this steps a headless browser through it one frame at a time at full HD
// and encodes the frames with ffmpeg — sharp text, no dropped frames.
//
// Usage:  npm run dev   (in another terminal)
//         npm run render:reel
//         npm run render:reel -- --fresh             (discard frames kept from an interrupted run)
//         npm run render:reel -- --stills 2.4,9,16   (PNG frames to .data/reel for checking)
// Env:    BASE_URL (default http://localhost:3000), BROWSER_PATH

import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import puppeteer, { type Browser, type Page } from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const WORK = path.join(process.cwd(), ".data", "reel");
const OUT_DIR = path.join(process.cwd(), "public", "media");
const POSTER_AT = 1.2;

function findBrowser() {
  const candidates = [
    process.env.BROWSER_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean) as string[];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("No Chrome or Edge found. Set BROWSER_PATH.");
  return found;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let browserProcess: ChildProcess | undefined;

/**
 * Starts Chrome/Edge with remote debugging and connects to it. (Some managed
 * Windows setups close the browser when automation launches it directly.)
 */
async function startBrowser(profile: string): Promise<Browser> {
  const port = 9300 + Math.floor(Math.random() * 500);
  browserProcess = spawn(
    findBrowser(),
    ["--headless=new", "--hide-scrollbars", "--force-color-profile=srgb", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, "about:blank"],
    { stdio: "ignore" },
  );
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      // A stalled screenshot fails in 15 s instead of the default 3 minutes.
      if (res.ok) return puppeteer.connect({ browserURL: `http://127.0.0.1:${port}`, defaultViewport: null, protocolTimeout: 15_000 });
    } catch {}
    await wait(500);
  }
  throw new Error("Browser did not start with remote debugging.");
}

async function main() {
  const stillsArg = process.argv.indexOf("--stills");
  const stills = stillsArg > 0 ? process.argv[stillsArg + 1].split(",").map(Number) : undefined;

  // Frames from an interrupted run are kept so the next run resumes.
  if (process.argv.includes("--fresh")) rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await startBrowser(mkdtempSync(path.join(tmpdir(), "amfire-reel-")));
  try {
    // On some Windows setups the headless tab turns "hidden" after a few
    // seconds and stops painting, which hangs screenshots. The flags above,
    // focus emulation and forcing the page lifecycle to active before each
    // frame prevent it.
    const [page] = await browser.pages();
    await page.bringToFront();
    const cdp = await page.createCDPSession();
    await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
    const keepActive = () => cdp.send("Page.setWebLifecycleState", { state: "active" });
    /** Seeks to `t` and screenshots, waking the page and retrying if a frame stalls. */
    const shoot = async (t: number, opts: Parameters<Page["screenshot"]>[0]) => {
      for (let attempt = 1; ; attempt++) {
        try {
          await keepActive();
          await page.evaluate((s) => window.__reel!.seek(s), t);
          return await page.screenshot(opts);
        } catch (err) {
          if (attempt === 4) throw err;
          console.log(`
Frame at ${t.toFixed(2)}s stalled (page ${await page.evaluate(() => document.visibilityState).catch(() => "unknown")}); retrying`);
          await page.bringToFront();
          await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
        }
      }
    };
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
    await page.goto(`${BASE}/reel`, { waitUntil: "networkidle0", timeout: 120_000 });
    await page.waitForFunction(() => window.__reel?.ready, { timeout: 60_000 });
    // The Next.js dev-mode badge.
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    const { duration, fps } = await page.evaluate(() => ({ duration: window.__reel!.duration, fps: window.__reel!.fps }));

    if (stills) {
      for (const t of stills) await shoot(t, { path: path.join(WORK, `t-${t}.png`) as `${string}.png` });
      console.log(`Wrote ${stills.length} stills to ${WORK}`);
      return;
    }

    // Frames go to disk first and are encoded afterwards.
    const frames = path.join(WORK, "frames");
    mkdirSync(frames, { recursive: true });
    const total = Math.round(duration * fps);
    const started = Date.now();
    for (let i = 0; i < total; i++) {
      const file = path.join(frames, `${String(i).padStart(5, "0")}.png`);
      if (!existsSync(file)) await shoot(i / fps, { path: file as `${string}.png`, optimizeForSpeed: true });
      if (i % fps === 0) process.stdout.write(`\rCapturing ${Math.round((i / total) * 100)}%  (${Math.round((Date.now() - started) / 1000)}s)`);
    }

    const out = path.join(OUT_DIR, "client-journey.mp4");
    console.log("\nEncoding…");
    execFileSync(
      "ffmpeg",
      ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(frames, "%05d.png"),
        "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-tune", "animation", "-profile:v", "high", "-pix_fmt", "yuv420p",
        "-g", String(fps * 2), "-movflags", "+faststart", out],
      { stdio: "inherit" },
    );
    rmSync(frames, { recursive: true, force: true });
    console.log(`Wrote ${out}`);

    await shoot(POSTER_AT, { path: path.join(OUT_DIR, "client-journey-poster.jpg") as `${string}.jpg`, type: "jpeg", quality: 90 });
    console.log("Wrote poster");

    const journeyFile = path.join(process.cwd(), "src", "knowledge", "journey.json");
    const journey = JSON.parse(readFileSync(journeyFile, "utf8"));
    journey.version = createHash("sha1").update(readFileSync(out)).digest("hex").slice(0, 10);
    writeFileSync(journeyFile, `${JSON.stringify(journey, null, 2)}
`);
    console.log(`Video version ${journey.version}`);
  } finally {
    await browser.close().catch(() => {});
    browserProcess?.kill();
  }
}

main().catch((err) => {
  console.error(err);
  browserProcess?.kill();
  process.exit(1);
});
