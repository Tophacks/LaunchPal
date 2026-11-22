// Creates the window.launchpal singleton and a tiny status store for React.
import { api } from "wasp/client/api";
import { createBrowserAdapter } from "./browserAdapter";
import { createDesktopAdapter } from "./desktopAdapter";
import { CLIENT_TIMEOUT_MS, makeProxyInspect } from "./inspectClient";
import { createLaunchpal } from "./launchpal";
import { mockInspect } from "./mock";
import type { LaunchpalStatus } from "./types";

export const MOCK_INSPECT = String(import.meta.env.REACT_APP_MOCK_INSPECT ?? "").toLowerCase() === "true";

const listeners = new Set<() => void>();

function build() {
  const native = window.launchpalNative;
  const adapter = native ? createDesktopAdapter(native) : createBrowserAdapter();
  const inspect = MOCK_INSPECT
    ? mockInspect
    : makeProxyInspect((path, body) => api.post(path, { json: body, timeout: CLIENT_TIMEOUT_MS }).json());
  return createLaunchpal({
    adapter,
    inspect,
    onStatus: () => listeners.forEach((l) => l()),
  });
}

type Instance = ReturnType<typeof createLaunchpal>;
let instance: Instance | null = null;

/** The single LaunchPal instance; also installed as window.launchpal. */
export function getLaunchpal(): Instance {
  if (!instance) {
    instance = build();
    window.launchpal = instance;
  }
  return instance;
}

export function subscribeStatus(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getStatus(): LaunchpalStatus {
  return getLaunchpal().getStatus();
}
