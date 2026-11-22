// Runs the 6 fixture screenshots through /inspect, draws each returned box on the actual input
// image (fixtures/out/<name>.annotated.png) and checks it against the DOM ground truth.
//
// Modes (first match wins):
//   BASE_URL + INSPECT_BEARER_TOKEN  -> HTTP against a running/deployed service (real model if deployed with a key)
//   OPENAI_API_KEY + INSPECT_BEARER_TOKEN (no BASE_URL) -> in-process service with the real OpenAI model
//   --mock                           -> scripted model derived from ground truth. PIPELINE CHECK ONLY: says nothing about model accuracy.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { createServer } from "../src/server.js";
import { createOpenAIModel, type ModelClient } from "../src/model.js";
import { loadConfig } from "../src/config.js";
const { chromium } = createRequire(import.meta.url)("playwright") as typeof import("playwright");

type Box = { x: number; y: number; width: number; height: number };
const names = ["start", "blocked", "success", "loading", "cropped", "unrelated"] as const;
const expected: Record<string, "point" | "done" | "unclear"> = { start: "point", blocked: "point", success: "done", loading: "unclear", cropped: "unclear", unrelated: "unclear" };
const truth = JSON.parse(readFileSync("fixtures/truth.json", "utf8")) as Record<string, Box>;
const url = (n: string) => "data:image/png;base64," + readFileSync(`fixtures/${n}.png`).toString("base64");
const mock = process.argv.includes("--mock");
const guide = readFileSync("guide/acme-sync.md", "utf8");
const TOKEN = process.env.INSPECT_BEARER_TOKEN ?? "local-test-token";

let base = process.env.BASE_URL?.replace(/\/$/, "");
let closer = () => {};
if (!base) {
  let model: ModelClient;
  let cfg;
  if (mock) {
    const byUrl = new Map(names.map((n) => [url(n), n]));
    const g = (b: Box) => ({ x: Math.round((b.x + 0.003) * 1000), y: Math.round((b.y - 0.002) * 1000), width: Math.round(b.width * 1000), height: Math.round(b.height * 1000) });
    model = { async inspect({ imageDataUrl }) {
      const n = byUrl.get(imageDataUrl)!;
      if (n === "start") return { status: "point", instruction: "Click Connect workspace.", visible_label: "Connect workspace", success_evidence: null, target: g(truth.start!) };
      if (n === "blocked") return { status: "point", instruction: "Click Allow access.", visible_label: "Allow access", success_evidence: null, target: g(truth.blocked!) };
      if (n === "success") return { status: "done", instruction: "Your workspace is connected.", visible_label: null, success_evidence: "Workspace connected + Sync status: Active", target: null };
      return { status: "unclear", instruction: "Please open the Acme Sync setup page and share that whole window.", visible_label: null, success_evidence: null, target: null };
    } };
    cfg = { inspectToken: TOKEN, openaiTimeoutMs: 20000, maxImageBytes: 2 * 1024 * 1024, openaiModel: "mock" };
  } else {
    cfg = loadConfig({ ...process.env, INSPECT_BEARER_TOKEN: TOKEN });
    model = createOpenAIModel(cfg);
  }
  const srv = createServer({ config: cfg, model, guide });
  await new Promise<void>((r) => srv.listen(0, r));
  base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
  closer = () => srv.close();
}
console.log(`mode: ${process.env.BASE_URL ? "http " + base : mock ? "MOCK (pipeline only, not model accuracy)" : "in-process real OpenAI model"}`);

const iou = (a: Box, b: Box) => {
  const w = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const h = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return (w * h) / (a.width * a.height + b.width * b.height - w * h);
};

mkdirSync("fixtures/out", { recursive: true });
const browser = await chromium.launch();
const rows: string[] = [];
let failures = 0;
for (const n of names) {
  const t0 = performance.now();
  const res = await fetch(`${base}/inspect`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ frameId: `fx-${n}`, imageDataUrl: url(n), question: "Where do I click?" }) });
  const ms = Math.round(performance.now() - t0);
  const j = (await res.json()) as any;
  const problems: string[] = [];
  if (res.status !== 200) problems.push(`HTTP ${res.status} ${j?.error?.code}`);
  else {
    if (j.frameId !== `fx-${n}`) problems.push("frameId not echoed");
    if (j.status !== expected[n]) problems.push(`expected ${expected[n]}, got ${j.status}`);
    if (j.status !== "point" && j.target !== null) problems.push("non-point has a box");
    if (j.status === "point") {
      const t = j.target as Box, g = truth[n]!;
      const cx = t.x + t.width / 2, cy = t.y + t.height / 2;
      const inside = (b: Box, px: number, py: number) => px >= b.x && px <= b.x + b.width && py >= b.y && py <= b.y + b.height;
      const encloses = t.x <= g.x + 0.01 && t.y <= g.y + 0.01 && t.x + t.width >= g.x + g.width - 0.01 && t.y + t.height >= g.y + g.height - 0.01;
      const score = iou(t, g);
      if (!inside(g, cx, cy)) problems.push("box center not on intended control");
      if (!encloses) problems.push("box does not enclose control (1% tolerance)");
      if (score < 0.6) problems.push(`IoU ${score.toFixed(2)} < 0.6`);
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.setContent(`<body style="margin:0"><div style="position:relative;width:1280px;height:800px"><img src="${url(n)}"><div style="position:absolute;left:${t.x * 100}%;top:${t.y * 100}%;width:${t.width * 100}%;height:${t.height * 100}%;border:3px solid #ff2d55;border-radius:6px;box-shadow:0 0 0 2px #fff"></div></div></body>`);
      await page.waitForLoadState("load");
      await page.screenshot({ path: `fixtures/out/${n}.annotated.png` });
      await page.close();
      rows.push(`| ${n} | point | "${j.instruction}" | ${score.toFixed(2)} | ${ms} | ${problems.length ? "FAIL " + problems.join("; ") : "pass"} |`);
    } else rows.push(`| ${n} | ${j.status} | "${j.instruction}" | n/a (target null) | ${ms} | ${problems.length ? "FAIL " + problems.join("; ") : "pass"} |`);
  }
  if (res.status !== 200) rows.push(`| ${n} | error | | | ${ms} | FAIL ${problems.join("; ")} |`);
  if (problems.length) failures++;
}
await browser.close();
closer();
const out = "| fixture | status | instruction | IoU vs control | ms | result |\n|---|---|---|---|---|---|\n" + rows.join("\n");
console.log(out);
writeFileSync("fixtures/out/results.md", out + "\n");
process.exit(failures ? 1 : 0);
