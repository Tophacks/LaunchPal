import { BrowserWindow, ipcMain, screen } from "electron";
import path from "node:path";
import type { Ring, Target } from "./types";

let overlay: BrowserWindow | null = null;
let overlayReady = false;
/** What the overlay should currently show; replayed once the renderer has loaded. */
let currentRings: Ring[] = [];
let ackSeq = 0;
const pendingAcks = new Map<number, () => void>();

/** Bounds (DIP) of the primary display; the ring and the capture both cover exactly this area. */
export function primaryBounds() {
  return screen.getPrimaryDisplay().bounds;
}

export function createOverlay(): BrowserWindow {
  const b = primaryBounds();
  overlay = new BrowserWindow({
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    focusable: false,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "overlay-preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.setIgnoreMouseEvents(true, { forward: true });
  // Exclude the ring from every screen capture (Windows: WDA_EXCLUDEFROMCAPTURE, macOS: sharingType none).
  // LAUNCHPAL_DEBUG_CAPTURE_OVERLAY=1 turns this off so alignment can be checked with a screenshot.
  overlay.setContentProtection(process.env.LAUNCHPAL_DEBUG_CAPTURE_OVERLAY !== "1");

  overlay.webContents.on("did-finish-load", () => {
    overlayReady = true;
    void sendAndWait("overlay:show", currentRings);
  });
  overlay.once("ready-to-show", () => {
    if (!overlay) return;
    overlay.showInactive();
    fitToPrimary();
  });
  overlay.loadFile(path.join(__dirname, "..", "static", "overlay.html"));

  // Keep covering the primary display if resolution/scale/arrangement changes.
  const refit = () => fitToPrimary();
  screen.on("display-metrics-changed", refit);
  screen.on("display-added", refit);
  screen.on("display-removed", refit);
  overlay.on("closed", () => {
    screen.off("display-metrics-changed", refit);
    screen.off("display-added", refit);
    screen.off("display-removed", refit);
    overlay = null;
  });

  ipcMain.on("overlay:ack", (_e, id: number) => {
    const done = pendingAcks.get(id);
    if (done) {
      pendingAcks.delete(id);
      done();
    }
  });

  return overlay;
}

/**
 * Cover the full primary display, including the taskbar/dock area. Windows clamps new windows to the
 * work area, so re-apply the bounds after the window is shown and on top, then verify.
 */
function fitToPrimary(attempt = 0) {
  if (!overlay || overlay.isDestroyed()) return;
  const b = primaryBounds();
  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setBounds({ x: b.x, y: b.y, width: b.width, height: b.height });
  const got = overlay.getBounds();
  const ok = got.x === b.x && got.y === b.y && got.width === b.width && got.height === b.height;
  if (!ok && attempt < 5) {
    setTimeout(() => fitToPrimary(attempt + 1), 100);
  } else if (!ok) {
    console.warn("[launchpal] overlay could not cover the full display", JSON.stringify({ want: b, got }));
  }
}

/** Sends a command to the overlay renderer and resolves once it has painted (or after a short timeout). */
function sendAndWait(channel: string, payload?: unknown, timeoutMs = 250): Promise<void> {
  const win = overlay;
  if (!win || win.isDestroyed() || !overlayReady) return Promise.resolve();
  const id = ++ackSeq;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingAcks.delete(id);
      resolve();
    }, timeoutMs);
    pendingAcks.set(id, () => {
      clearTimeout(timer);
      resolve();
    });
    win.webContents.send(channel, { id, payload });
  });
}

function isValidTarget(t: unknown): t is Target {
  if (!t || typeof t !== "object") return false;
  const { x, y, width, height } = t as Record<string, unknown>;
  return [x, y, width, height].every((v) => typeof v === "number" && Number.isFinite(v)) &&
    (width as number) > 0 && (height as number) > 0;
}

export function showRings(rings: Ring[]): Promise<void> {
  const valid = rings.filter((r) => isValidTarget(r.target)).map((r) => ({
    target: r.target,
    label: typeof r.label === "string" ? r.label.slice(0, 200) : "",
  }));
  currentRings = valid;
  if (overlay && !overlay.isDestroyed()) overlay.setAlwaysOnTop(true, "screen-saver");
  return sendAndWait("overlay:show", valid);
}

export function getCurrentRings(): Ring[] {
  return currentRings;
}

export function showRing(target: Target, label?: string): Promise<void> {
  return showRings([{ target, label }]);
}

export function clearRing(): Promise<void> {
  currentRings = [];
  return sendAndWait("overlay:clear");
}

/** Current ring rectangle in screen DIP coordinates (used to keep the control window out of the way). */
export function targetToScreenRect(t: Target) {
  const b = primaryBounds();
  return {
    x: b.x + t.x * b.width,
    y: b.y + t.y * b.height,
    width: t.width * b.width,
    height: t.height * b.height,
  };
}
