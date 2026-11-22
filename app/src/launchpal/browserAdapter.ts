import { LaunchpalError } from "./inspectClient";
import type { CaptureAdapter } from "./launchpal";

/**
 * Browser fallback (getDisplayMedia + in-page preview ring) lands in M7. Until then browser mode
 * explains how to get the desktop helper instead of failing silently.
 */
export function createBrowserAdapter(): CaptureAdapter {
  const notYet = () => {
    throw new LaunchpalError("Open LaunchPal in the desktop helper to get on-screen guidance.", "browser-unsupported");
  };
  return {
    mode: "browser",
    captureFrame: async () => notYet(),
    captureThumb: async () => notYet(),
    showRing: async () => {},
    clearRing: async () => {},
  };
}
