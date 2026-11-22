// Creates the window.launchpal singleton and a tiny status store for React.
import { api } from "wasp/client/api";
import { createBrowserAdapter } from "./browserAdapter";
import { createDesktopAdapter } from "./desktopAdapter";
import { CLIENT_TIMEOUT_MS, LaunchpalError, makeProxyInspect } from "./inspectClient";
import { createLaunchpal } from "./launchpal";
import { mockInspect } from "./mock";
import { GUIDE_ID_RE, type LaunchpalStatus } from "./types";

export const MOCK_INSPECT = String(import.meta.env.REACT_APP_MOCK_INSPECT ?? "").toLowerCase() === "true";

const listeners = new Set<() => void>();

export const GUIDE_MISSING = "This setup guide isn't available. Check the help link from the product's website.";

/** Guide slug from /help/:guideSlug, if it's a valid guideId. */
export function guideIdFromLocation(pathname = window.location.pathname): string | undefined {
  const m = /^\/help\/([^/?#]+)/.exec(pathname);
  const slug = m ? decodeURIComponent(m[1]).toLowerCase() : "";
  return GUIDE_ID_RE.test(slug) ? slug : undefined;
}

async function postJson(path: string, body: unknown) {
  try {
    return await api.post(path, { json: body, timeout: CLIENT_TIMEOUT_MS }).json();
  } catch (e) {
    const status = (e as { response?: Response }).response?.status;
    if (status === 404) throw new LaunchpalError(GUIDE_MISSING, "guide-not-found");
    throw e;
  }
}

function build() {
  const native = window.launchpalNative;
  const adapter = native ? createDesktopAdapter(native) : createBrowserAdapter();
  const inspect = MOCK_INSPECT ? mockInspect : makeProxyInspect(postJson);
  return createLaunchpal({
    adapter,
    inspect,
    guideId: guideIdFromLocation(),
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
