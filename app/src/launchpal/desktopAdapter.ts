import { GENERIC_ERROR, LaunchpalError } from "./inspectClient";
import type { CaptureAdapter } from "./launchpal";
import type { LaunchpalNative } from "./types";

/** Desktop mode: Electron preload bridge (window.launchpalNative). */
export function createDesktopAdapter(native: LaunchpalNative): CaptureAdapter {
  return {
    mode: "desktop",
    async captureFrame() {
      const r = await native.captureFrame();
      if (!r.ok) throw new LaunchpalError(r.message || GENERIC_ERROR, r.code);
      return { imageDataUrl: r.frame.imageDataUrl, blank: r.frame.blank };
    },
    async captureThumb() {
      const r = await native.captureThumb();
      if (!r.ok) throw new LaunchpalError(r.message || GENERIC_ERROR, r.code);
      return { thumb: r.thumb, exclude: r.exclude };
    },
    showRing: (target, label) => native.showRing(target, label),
    clearRing: () => native.clearRing(),
  };
}
