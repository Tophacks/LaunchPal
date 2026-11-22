import { action, api, apiNamespace, app, page, route } from "@wasp.sh/spec";
import { getElevenLabsToken } from "./src/server/elevenlabs" with { type: "ref" };
import { ControlPanelPage } from "./src/ControlPanelPage" with { type: "ref" };
import {
  inspectHealth,
  inspectNamespaceMiddleware,
  inspectProxy,
} from "./src/server/inspectProxy" with { type: "ref" };

// Shared Wasp entry point (owner: fe). Nate adds founder-admin routes/auth here in his PRs (flag them to fe).
export default app({
  name: "launchpal",
  wasp: { version: "^0.26.1" },
  title: "LaunchPal",
  head: [
    "<link rel='icon' href='/favicon.ico' />",
    "<meta name='viewport' content='width=device-width, initial-scale=1' />",
  ],
  spec: [
    // Customer support UI (no login). /help/:guideSlug is the founder's support link.
    route("PanelRoute", "/", page(ControlPanelPage)),
    route("HelpRoute", "/help/:guideSlug", page(ControlPanelPage)),

    // Server proxy to Maritime. The namespace enables CORS + a JSON body limit big enough for a screenshot.
    apiNamespace("/api/inspect", { middlewareConfigFn: inspectNamespaceMiddleware }),
    api("GET", "/api/inspect/health", inspectHealth, { auth: false }),
    api("POST", "/api/inspect", inspectProxy, { auth: false }),

    // Voice (Alisa's VoiceSession uses this): short-lived ElevenLabs conversation token.
    action(getElevenLabsToken),
  ],
});
