// Browser fallback: the customer shares their screen once (getDisplayMedia); frames come from that stream and
// the ring is drawn on an in-page preview (ScreenPreview) instead of the real screen.
import { LaunchpalError } from "./inspectClient";
import type { CaptureAdapter } from "./launchpal";
import type { Target } from "./types";

const MAX_LONG_EDGE = 1920;
const MAX_DECODED_BYTES = 2 * 1024 * 1024;
const JPEG_QUALITIES = [0.85, 0.75, 0.65, 0.5, 0.4];
const THUMB_W = 64;
const THUMB_H = 36;

export const SHARE_CANCELLED = "Screen sharing was cancelled. Press Start and choose your entire screen.";
export const SHARE_ENDED = "Screen sharing stopped. Press Start to share your screen again.";

export interface BrowserShareState {
  stream: MediaStream | null;
  ring: { target: Target; label: string } | null;
}

let state: BrowserShareState = { stream: null, ring: null };
const listeners = new Set<() => void>();
let onEnded: (() => void) | null = null;

function set(patch: Partial<BrowserShareState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeShare(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function getShareState() {
  return state;
}
/** Called when the customer stops sharing from the browser's own UI. */
export function onShareEnded(cb: () => void) {
  onEnded = cb;
}

export function stopSharing() {
  state.stream?.getTracks().forEach((t) => t.stop());
  set({ stream: null, ring: null });
}

let video: HTMLVideoElement | null = null;
let pending: Promise<HTMLVideoElement> | null = null;

async function ensureStream(): Promise<HTMLVideoElement> {
  if (video && state.stream?.active) return video;
  if (pending) return pending;
  pending = (async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new LaunchpalError("This browser can't share your screen. Try Chrome or Edge.", "unsupported");
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor", frameRate: 5 } as MediaTrackConstraints,
        audio: false,
      });
    } catch {
      throw new LaunchpalError(SHARE_CANCELLED, "share-cancelled");
    }
    const track = stream.getVideoTracks()[0];
    track.addEventListener("ended", () => {
      set({ stream: null, ring: null });
      video = null;
      onEnded?.();
    });
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.srcObject = stream;
    await v.play();
    if (!v.videoWidth) await new Promise((r) => v.addEventListener("loadedmetadata", r, { once: true }));
    video = v;
    set({ stream });
    return v;
  })();
  try {
    return await pending;
  } finally {
    pending = null;
  }
}

function draw(v: HTMLVideoElement, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(v, 0, 0, w, h);
  return { c, ctx };
}

function decodedBytes(dataUrl: string) {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((b64.length * 3) / 4);
}

export function createBrowserAdapter(): CaptureAdapter {
  return {
    mode: "browser",
    async captureFrame() {
      const v = await ensureStream();
      const scale = Math.min(1, MAX_LONG_EDGE / Math.max(v.videoWidth, v.videoHeight));
      const w = Math.round(v.videoWidth * scale);
      const h = Math.round(v.videoHeight * scale);
      const { c, ctx } = draw(v, w, h);
      let url = "";
      for (const q of JPEG_QUALITIES) {
        url = c.toDataURL("image/jpeg", q);
        if (decodedBytes(url) <= MAX_DECODED_BYTES) break;
      }
      // Blank check: a flat frame means nothing useful was shared.
      const px = ctx.getImageData(0, 0, w, h).data;
      let min = 255, max = 0;
      for (let i = 0; i < px.length; i += 4 * 997) {
        const g = (px[i] + px[i + 1] + px[i + 2]) / 3;
        if (g < min) min = g;
        if (g > max) max = g;
      }
      return { imageDataUrl: url, blank: max - min < 4 };
    },
    async captureThumb() {
      const v = await ensureStream();
      const { ctx } = draw(v, THUMB_W, THUMB_H);
      const px = ctx.getImageData(0, 0, THUMB_W, THUMB_H).data;
      const gray = new Array<number>(THUMB_W * THUMB_H);
      for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
        gray[p] = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
      }
      return { thumb: { width: THUMB_W, height: THUMB_H, gray }, exclude: null };
    },
    async showRing(target, label) {
      set({ ring: { target, label } });
    },
    async clearRing() {
      if (state.ring) set({ ring: null });
    },
  };
}
