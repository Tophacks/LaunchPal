// Renders the Acme Sync FIXTURE screens to PNG and records DOM-derived ground-truth boxes.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright") as typeof import("playwright");

import { W, H, shell, start, dialog, success, loading, unrelated } from "./fixture-html.js";

interface Spec { name: string; html: string; truth?: Record<string, string>; crop?: { x: number; y: number; width: number; height: number } }
const specs: Spec[] = [
  { name: "start", html: shell(start), truth: { point: "#connect" } },
  { name: "blocked", html: shell(start, dialog), truth: { point: "#allow" } },
  { name: "success", html: shell(success) },
  { name: "loading", html: shell(loading) },
  { name: "cropped", html: shell(start), crop: { x: 0, y: 0, width: 420, height: 800 } },
  { name: "unrelated", html: unrelated },
];

mkdirSync("fixtures/out", { recursive: true });
const browser = await chromium.launch();
const truth: Record<string, unknown> = {};
for (const s of specs) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(s.html);
  await page.screenshot({ path: `fixtures/${s.name}.png`, ...(s.crop ? { clip: s.crop } : {}) });
  if (s.truth) {
    const sel = s.truth.point!;
    const b = await page.locator(sel).boundingBox();
    if (b) truth[s.name] = { x: b.x / W, y: b.y / H, width: b.width / W, height: b.height / H, selector: sel };
  }
  await page.close();
}
await browser.close();
writeFileSync("fixtures/truth.json", JSON.stringify(truth, null, 2) + "\n");
console.log("rendered", specs.map((s) => s.name).join(", "));
