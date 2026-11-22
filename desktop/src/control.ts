import { BrowserWindow, ipcMain, screen, session, shell } from "electron";
import path from "node:path";
import { captureFrame, captureThumb, CaptureError } from "./capture";
import { clearRing, getCurrentRings, primaryBounds, showRing, targetToScreenRect } from "./overlay";
import type { Target } from "./types";

const W = 360;
const H = 560;
const MARGIN = 16;
type Corner = "bottom-right" | "bottom-left" | "top-right" | "top-left";

let control: BrowserWindow | null = null;
let corner: Corner = "bottom-right";

export function panelUrl(): string {
  return process.env.LAUNCHPAL_PANEL_URL || "http://localhost:3000";
}

function cornerBounds(c: Corner) {
  const wa = screen.getPrimaryDisplay().workArea;
  const x = c.endsWith("right") ? wa.x + wa.width - W - MARGIN : wa.x + MARGIN;
  const y = c.startsWith("bottom") ? wa.y + wa.height - H - MARGIN : wa.y + MARGIN;
  return { x, y, width: W, height: H };
}

const OPPOSITE: Record<Corner, Corner> = {
  "bottom-right": "top-left",
  "top-left": "bottom-right",
  "bottom-left": "top-right",
  "top-right": "bottom-left",
};

function intersects(a: { x: number; y: number; width: number; height: number }, b: typeof a, pad = 24) {
  return a.x - pad < b.x + b.width && a.x + a.width + pad > b.x && a.y - pad < b.y + b.height && a.y + a.height + pad > b.y;
}

/** Keep the control window out from under the ring: jump to the opposite corner if they overlap. */
function avoidRing(t: Target) {
  if (!control || control.isDestroyed()) return;
  const ring = targetToScreenRect(t);
  if (!intersects(control.getBounds(), ring)) return;
  const next = OPPOSITE[corner];
  if (intersects(cornerBounds(next), ring)) return; // nowhere better; stay put
  corner = next;
  control.setBounds(cornerBounds(corner));
}

/**
 * Windows lets a window that covers the whole monitor (e.g. a full-screen installer) rise above normal
 * always-on-top windows. Re-assert the control window whenever guidance changes.
 */
function keepOnTop() {
  if (!control || control.isDestroyed() || control.isMinimized()) return;
  control.setAlwaysOnTop(true, "pop-up-menu");
  control.moveTop();
}

/** Control window region as fractions of the primary display (excluded from guided-mode change detection). */
function controlRegion() {
  if (!control || control.isDestroyed() || !control.isVisible()) return null;
  const b = primaryBounds();
  const c = control.getBounds();
  return { x: (c.x - b.x) / b.width, y: (c.y - b.y) / b.height, width: c.width / b.width, height: c.height / b.height };
}

function errorPayload(e: unknown) {
  if (e instanceof CaptureError) return { ok: false as const, code: e.code, message: e.message };
  return { ok: false as const, code: "capture-failed", message: "Couldn't capture the screen." };
}

function isFromControl(e: Electron.IpcMainInvokeEvent) {
  return !!control && !control.isDestroyed() && e.sender === control.webContents;
}

export function registerNativeIpc() {
  ipcMain.handle("native:captureFrame", async (e) => {
    if (!isFromControl(e)) return { ok: false, code: "forbidden", message: "Not allowed." };
    try {
      return { ok: true, frame: await captureFrame() };
    } catch (err) {
      return errorPayload(err);
    }
  });
  ipcMain.handle("native:captureThumb", async (e) => {
    if (!isFromControl(e)) return { ok: false, code: "forbidden", message: "Not allowed." };
    try {
      // Ignore LaunchPal's own windows: the control panel, and the ring + label when it's visible to captures
      // (recording mode). Padded so the label above/below the ring is covered too.
      const exclude = [controlRegion(), ...getCurrentRings().map((r) => ({
        x: r.target.x - 0.15, y: r.target.y - 0.06, width: r.target.width + 0.3, height: r.target.height + 0.12,
      }))].filter((x) => x !== null);
      return { ok: true, thumb: await captureThumb(), exclude };
    } catch (err) {
      return errorPayload(err);
    }
  });
  ipcMain.handle("native:showRing", async (e, target: Target, label?: string) => {
    if (!isFromControl(e)) return;
    avoidRing(target);
    keepOnTop();
    await showRing(target, label); // re-asserts the overlay above the control window
  });
  ipcMain.handle("native:clearRing", async (e) => {
    if (!isFromControl(e)) return;
    await clearRing();
  });
}

export function createControlWindow(url = panelUrl()): BrowserWindow {
  corner = "bottom-right";
  control = new BrowserWindow({
    ...cornerBounds(corner),
    title: "LaunchPal",
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  control.setAlwaysOnTop(true, "pop-up-menu");

  // Microphone for the voice agent; nothing else.
  const allowed = new URL(url).origin;
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb, details) => {
    const origin = (() => {
      try {
        return new URL(details.requestingUrl || wc.getURL()).origin;
      } catch {
        return "";
      }
    })();
    cb(permission === "media" && origin === allowed);
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
    return permission === "media" && requestingOrigin === allowed;
  });

  // External links open in the real browser, never inside the helper.
  control.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:/i.test(target)) void shell.openExternal(target);
    return { action: "deny" };
  });

  // If the panel isn't reachable, show a local page with a retry button.
  control.webContents.on("did-fail-load", (_e, code, _desc, failedUrl, isMainFrame) => {
    if (!isMainFrame || code === -3 /* aborted */ || failedUrl.startsWith("file:")) return;
    void control?.loadFile(path.join(__dirname, "..", "static", "offline.html"), {
      query: { url },
    });
  });

  void control.loadURL(url);
  control.on("closed", () => {
    control = null;
    void clearRing();
  });
  return control;
}

export function getControlWindow() {
  return control;
}
