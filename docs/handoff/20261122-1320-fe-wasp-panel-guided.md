# fe: Wasp control panel + /api/inspect proxy + guided mode end to end (M1, M4, M5)

- **What changed:** `app/` is now a Wasp 0.26 app (`main.wasp.ts`). Routes `/` and `/help/:guideSlug` → control panel (Start guided setup / Ask: Where do I click? / Stop, status strip, voice placeholder, dev "next: unclear"). `POST /api/inspect` proxies to `${MARITIME_INSPECT_URL}/inspect` with `Bearer ${MARITIME_TOKEN}` (validates, 2 MB decoded cap, 15 s timeout, clean error JSON, no image logging); `GET /api/inspect/health` proxies Maritime `/health`. `window.launchpal` installed by the panel. Desktop: `npm run fixture-demo` shows start → blocked → success fixtures full-screen; click to advance like an installer.
- **Branch/PR:** feat/frontend.
- **What works (Windows, mock mode):** Electron control window loads the panel in desktop mode; guided setup rings Connect workspace → (click) Allow access → (click) "Setup complete ✅"; 3 `launchpal:step` events; control window jumps to the opposite corner when the ring would overlap it. Proxy returns clean 400/502 JSON; CORS preflight OK.
- **How to run/test:** Wasp needs Linux/macOS (Windows: WSL; `scripts/wsl-sync-app.sh` mirrors app/ into WSL). `cd app && cp .env.client.example .env.client && cp .env.server.example .env.server && wasp install && wasp start`. Then `cd desktop && npm run fixture-demo` and press Start guided setup; click the screenshot to "do" each step.
- **Contract changes:** none. **Env name change:** client mock flag is `REACT_APP_MOCK_INSPECT=true` (Wasp only exposes `REACT_APP_*` to the client), not `VITE_MOCK_INSPECT`.
- **Blockers:** real vision needs Nate's deployed endpoint (or a local run with OPENAI_API_KEY).
- **Who needs to act next:**
  - **Alisa:** `window.launchpal` is ready with mocks: `inspectScreen("Where do I click?")` (rejects with a speakable `Error.message`), `startGuided()` / `stopGuided()`, `window` event `launchpal:step` (detail = InspectResponse). Run the app with `REACT_APP_MOCK_INSPECT=true`. `app/src/voice/VoiceSession.tsx` mount point comes next.
  - **Nate:** reading PR #4 now. Add founder-admin routes to `app/main.wasp.ts` in your PR and flag them.
