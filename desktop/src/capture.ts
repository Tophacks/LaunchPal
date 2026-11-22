import { desktopCapturer, screen, systemPreferences, type NativeImage } from "electron";
import { clearRing } from "./overlay";
import type { CapturedFrame } from "./types";

const MAX_LONG_EDGE = 1920;
const MAX_DECODED_BYTES = 2 * 1024 * 1024;
const JPEG_QUALITIES = [85, 75, 65, 50, 40];
export const THUMB_W = 64;
export const THUMB_H = 36;

export class CaptureError extends Error {
  constructor(public code: "screen-permission" | "no-source" | "capture-failed", message: string) {
    super(message);
  }
}

/** macOS needs Screen Recording permission; without it captures come back blank or wallpaper-only. */
function checkPermission() {
  if (process.platform !== "darwin") return;
  const status = systemPreferences.getMediaAccessStatus("screen");
  if (status !== "granted" && status !== "not-determined") {
    throw new CaptureError(
      "screen-permission",
      "Grant Screen Recording in System Settings, then restart LaunchPal.",
    );
  }
}

async function grabPrimary(width: number, height: number): Promise<NativeImage> {
  const primary = screen.getPrimaryDisplay();
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width, height },
    fetchWindowIcons: false,
  });
  if (!sources.length) throw new CaptureError("no-source", "No screen available to capture.");
  const src = sources.find((s) => s.display_id === String(primary.id)) ?? sources[0];
  if (src.thumbnail.isEmpty()) {
    if (process.platform === "darwin") {
      throw new CaptureError(
        "screen-permission",
        "Grant Screen Recording in System Settings, then restart LaunchPal.",
      );
    }
    throw new CaptureError("capture-failed", "Screen capture came back empty.");
  }
  return src.thumbnail;
}

/** True when a small sample of the image is (nearly) one flat colour, e.g. a permission-blocked capture. */
function looksBlank(img: NativeImage): boolean {
  const small = img.resize({ width: 32, height: 18 });
  const bmp = small.toBitmap(); // BGRA
  let min = 255;
  let max = 0;
  for (let i = 0; i < bmp.length; i += 4) {
    const g = (bmp[i] + bmp[i + 1] + bmp[i + 2]) / 3;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  return max - min < 4;
}

/** Full primary screen as a JPEG data URL, long edge ≤ 1920 px, ≤ 2 MB decoded. Never written to disk. */
export async function captureFrame(): Promise<CapturedFrame> {
  checkPermission();
  await clearRing(); // belt and braces: the overlay is also content-protected
  const d = screen.getPrimaryDisplay();
  const pw = Math.round(d.bounds.width * d.scaleFactor);
  const ph = Math.round(d.bounds.height * d.scaleFactor);
  let img = await grabPrimary(pw, ph);

  const { width, height } = img.getSize();
  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(width, height));
  if (scale < 1) {
    img = img.resize({
      width: Math.round(width * scale),
      height: Math.round(height * scale),
      quality: "best",
    });
  }
  const size = img.getSize();

  let jpeg: Buffer | null = null;
  for (const q of JPEG_QUALITIES) {
    jpeg = img.toJPEG(q);
    if (jpeg.length <= MAX_DECODED_BYTES) break;
  }
  if (!jpeg || jpeg.length > MAX_DECODED_BYTES) {
    throw new CaptureError("capture-failed", "Screen image too large to send.");
  }

  return {
    imageDataUrl: "data:image/jpeg;base64," + jpeg.toString("base64"),
    width: size.width,
    height: size.height,
    blank: looksBlank(img),
  };
}

/** Cheap 64×36 grayscale frame for change detection in guided mode (does not clear the ring). */
export async function captureThumb(): Promise<{ width: number; height: number; gray: number[] }> {
  checkPermission();
  let img = await grabPrimary(THUMB_W, THUMB_H);
  const s = img.getSize();
  if (s.width !== THUMB_W || s.height !== THUMB_H) {
    img = img.resize({ width: THUMB_W, height: THUMB_H });
  }
  const bmp = img.toBitmap(); // BGRA
  const gray = new Array<number>(THUMB_W * THUMB_H);
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    gray[p] = Math.round(0.114 * bmp[i] + 0.587 * bmp[i + 1] + 0.299 * bmp[i + 2]);
  }
  return { width: THUMB_W, height: THUMB_H, gray };
}
