// Renders FULL-SCREEN (1920x1080) captures of the Acme Sync fixture, as the desktop helper would send:
// whole primary screen incl. desktop and taskbar, installer window somewhere on it.
// Output: fixtures/screen/*.png + fixtures/screen/truth.json (DOM-derived fractions of the full screen).
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { W, H, css, shell, start, dialog, success, loading, unrelated } from "./fixture-html.js";
const { chromium } = createRequire(import.meta.url)("playwright") as typeof import("playwright");

const SW = 1920, SH = 1080;
const desk = `<style>html,body{margin:0}.desk{position:relative;width:${SW}px;height:${SH}px;overflow:hidden;background:linear-gradient(135deg,#27496d,#142850 60%,#0c7b93);font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif}
.task{position:absolute;left:0;right:0;bottom:0;height:48px;background:rgba(15,20,30,.92);display:flex;align-items:center;gap:10px;padding:0 14px;color:#cfd6e6;font-size:13px}.task i{width:30px;height:30px;border-radius:6px;background:#3a4560;display:block}.task span{margin-left:auto}
.icon{position:absolute;left:24px;width:64px;color:#fff;font-size:12px;text-align:center}.icon b{display:block;width:44px;height:44px;margin:0 auto 4px;border-radius:8px;background:rgba(255,255,255,.25)}
.win{position:absolute;width:${W}px;border-radius:8px;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,.5);background:#fff}.bar{height:32px;background:#e9ecf4;display:flex;align-items:center;padding:0 12px;font-size:13px;color:#333}
.app{width:${W}px;height:${H}px;display:flex;overflow:hidden;position:relative;font:16px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1c2333;background:#f4f6fb}</style>`;
// reuse the window-fixture css, but scope its body rules to .app
const appCss = css.replace(/body\{[^}]*\}/, "").replace(/\*\{box-sizing:border-box\}/, "*{box-sizing:border-box}");
const icons = `<div class="icon" style="top:24px"><b></b>Recycle Bin</div><div class="icon" style="top:120px"><b></b>Documents</div>`;
const task = `<div class="task"><i></i><i></i><i></i><i></i><span>10:42 AM</span></div>`;
const win = (inner: string, left: number, top: number) => `<div class="win" style="left:${left}px;top:${top}px"><div class="bar">Acme Sync Setup</div><div class="app">${inner.replace(/^<style>.*?<\/style>/s, "")}</div></div>`;
const inner = (html: string) => shell(html).replace(/<style>.*?<\/style>/s, "");
const page = (body: string) => `${desk}<style>${appCss}</style><div class="desk">${icons}${body}${task}</div>`;
const doc = `<div class="win" style="left:80px;top:40px;width:1700px;height:960px"><div class="bar">Quarterly notes - Docs</div><div style="padding:48px 80px;font-size:18px;line-height:1.7;color:#222;height:928px;background:#fff"><h1>Quarterly notes</h1><p>Revenue grew in every region this quarter. Action items for the next review are listed below.</p><ul><li>Finalize hiring plan</li><li>Review vendor contracts</li><li>Draft the board update</li></ul></div></div>`;

const L = 320, T = 100; // window position (window spans 1280x832 incl. title bar)
interface Spec { name: string; html: string; truth?: string }
const specs: Spec[] = [
  { name: "start", html: page(win(inner(start), L, T)), truth: "#connect" },
  { name: "blocked", html: page(win(inner(start + dialog), L, T)), truth: "#allow" },
  { name: "success", html: page(win(inner(success), L, T)) },
  { name: "loading", html: page(win(inner(loading), L, T)) },
  // Connect button pushed past the right screen edge:
  { name: "offscreen", html: page(win(inner(start), 1250, T)) },
  // Installer exists but a document window covers it:
  { name: "behind", html: page(win(inner(start), L, T) + doc) },
  { name: "unrelated", html: `<style>html,body{margin:0}</style>` + unrelated.replace("body{", "body{width:1920px;height:1080px;box-sizing:border-box;") },
];

mkdirSync("fixtures/screen", { recursive: true });
const browser = await chromium.launch();
const truth: Record<string, unknown> = {};
for (const s of specs) {
  const page = await browser.newPage({ viewport: { width: SW, height: SH }, deviceScaleFactor: 1 });
  await page.setContent(s.html);
  await page.screenshot({ path: `fixtures/screen/${s.name}.png` });
  if (s.truth) {
    const b = await page.locator(s.truth).boundingBox();
    if (b) truth[s.name] = { x: b.x / SW, y: b.y / SH, width: b.width / SW, height: b.height / SH, selector: s.truth };
  }
  await page.close();
}
await browser.close();
writeFileSync("fixtures/screen/truth.json", JSON.stringify(truth, null, 2) + "\n");
console.log("rendered", specs.map((s) => s.name).join(", "));
