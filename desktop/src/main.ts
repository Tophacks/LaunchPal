import { app, BrowserWindow, globalShortcut } from "electron";
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { createControlWindow, getControlWindow, panelUrl, registerNativeIpc } from "./control";
import { createOverlay, showRings, clearRing, primaryBounds } from "./overlay";
import type { Ring } from "./types";

const DEV = process.argv.includes("--dev") || process.env.LAUNCHPAL_DEV === "1";

const PROTOCOL = "launchpal";

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

// launchpal://guide/<slug> (from the support page) opens the panel on that founder's guide.
if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

function guideFromDeepLink(argv: string[]): string | null {
  const link = argv.find((a) => a.toLowerCase().startsWith(`${PROTOCOL}://`));
  if (!link) return null;
  const m = /^launchpal:\/\/guide\/([a-z0-9][a-z0-9-]{0,63})\/?$/i.exec(link.trim());
  return m ? m[1].toLowerCase() : "";
}

function panelUrlForGuide(guide: string | null): string {
  const base = panelUrl().replace(/\/+$/, "");
  return guide ? `${base}/help/${guide}` : base;
}

let pendingGuide: string | null = guideFromDeepLink(process.argv);

function openGuide(guide: string | null) {
  const control = getControlWindow();
  if (!control) {
    pendingGuide = guide;
    return;
  }
  if (guide !== null) void control.loadURL(panelUrlForGuide(guide));
  if (control.isMinimized()) control.restore();
  control.show();
  control.focus();
}

app.on("second-instance", (_e, argv) => openGuide(guideFromDeepLink(argv)));
app.on("open-url", (e, url) => {
  e.preventDefault();
  openGuide(guideFromDeepLink([url]));
});

// Alignment check: a 6%×6% box centred on the screen and tucked into each corner.
const S = 0.06;
const TEST_RINGS: Ring[] = [
  { target: { x: 0.5 - S / 2, y: 0.5 - S / 2, width: S, height: S }, label: "Centre" },
  { target: { x: 0, y: 0, width: S, height: S }, label: "Top left" },
  { target: { x: 1 - S, y: 0, width: S, height: S }, label: "Top right" },
  { target: { x: 0, y: 1 - S, width: S, height: S }, label: "Bottom left" },
  { target: { x: 1 - S, y: 1 - S, width: S, height: S }, label: "Bottom right" },
];

// Hardcoded mock response for the Acme Sync start screen (services/vision/README.md sample).
const MOCK_RING: Ring = {
  target: { x: 0.552, y: 0.266, width: 0.135, height: 0.053 },
  label: "Click Connect workspace.",
};

function registerDevShortcuts() {
  globalShortcut.register("CommandOrControl+Alt+Shift+R", () => void showRings(TEST_RINGS));
  globalShortcut.register("CommandOrControl+Alt+Shift+M", () => void showRings([MOCK_RING]));
  globalShortcut.register("CommandOrControl+Alt+Shift+C", () => void clearRing());
  globalShortcut.register("CommandOrControl+Alt+Shift+Q", () => app.quit());
}

/**
 * Dev only: `--fixture <png>` shows a screenshot fixture stretched over the whole primary display,
 * so fractional targets from services/vision samples land on the real control (alignment check).
 */
function openFixtureWindow(files: string[]) {
  const b = primaryBounds();
  const win = new BrowserWindow({
    ...b,
    frame: false,
    skipTaskbar: true,
    backgroundColor: "#000000",
    webPreferences: { sandbox: true, contextIsolation: true },
  });
  win.setBounds(b);
  // Fake installer: each click advances to the next screenshot (e.g. start → blocked → success).
  const imgs = files
    .map((f, i) => {
      const src = "data:image/png;base64," + fs.readFileSync(path.resolve(f)).toString("base64");
      return `<img src="${src}" style="width:100vw;height:100vh;object-fit:fill;display:${i ? "none" : "block"}">`;
    })
    .join("");
  const script =
    "let i=0;const im=[...document.images];window.nextFixture=()=>{im[i].style.display='none';i=Math.min(i+1,im.length-1);im[i].style.display='block'};document.body.onclick=window.nextFixture;";
  win.loadURL(
    "data:text/html," +
      encodeURIComponent(
        `<body style="margin:0;overflow:hidden;background:#000;cursor:pointer">${imgs}<script>${script}</script></body>`,
      ),
  );
}

app.whenReady().then(() => {
  const overlay = createOverlay();
  registerNativeIpc();
  const panel = DEV && process.argv.includes("--dev-panel")
    ? pathToFileURL(path.join(__dirname, "..", "static", "devpanel.html")).href +
      (process.argv.includes("--auto") ? "#auto" : "")
    : panelUrlForGuide(pendingGuide);
  pendingGuide = null;
  const control = createControlWindow(panel);
  if (DEV) {
    control.webContents.on("console-message", (e) => {
      if (e.message.startsWith("[devpanel]")) console.log(e.message);
    });
  }
  control.on("closed", () => app.quit());
  if (DEV) {
    registerDevShortcuts();
    const fixtureIdx = process.argv.indexOf("--fixture");
    if (fixtureIdx > 0 && process.argv[fixtureIdx + 1]) {
      openFixtureWindow(process.argv[fixtureIdx + 1].split(","));
      control.moveTop();
    }
    if (process.argv.includes("--test-rings")) void showRings(TEST_RINGS);
    if (process.argv.includes("--mock-ring")) void showRings([MOCK_RING]);
    overlay.once("show", () =>
      setTimeout(
        () => console.log("[launchpal] overlay bounds", JSON.stringify(overlay.getBounds())),
        800,
      ),
    );
    console.log(
      "[launchpal] dev shortcuts: Ctrl+Alt+Shift+R test rings, +M mock ring, +C clear, +Q quit",
    );
  }
});

app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", () => app.quit());
