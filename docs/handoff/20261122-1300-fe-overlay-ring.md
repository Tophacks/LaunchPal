# fe: on-screen ring overlay (M2)

- **What changed:** New `desktop/` Electron + TS app. Transparent, click-through, always-on-top overlay over the full primary display (covers the taskbar too) draws a pulsing ring + label from fractional targets. Content protection on, so the ring never appears in captures. Dev shortcuts + `--fixture` alignment check.
- **Branch/PR:** feat/frontend.
- **What works (verified on Windows 1920×1080 @125%):** test rings land at the centre and all four corners; the Acme Sync `start.png` sample target lands exactly on "Connect workspace"; screenshots with protection on don't show the ring.
- **How to run/test:** `cd desktop && npm install && npm run test-rings`. Dev shortcuts: Ctrl+Alt+Shift+R test rings, +M mock ring, +C clear, +Q quit. Alignment: `npm run build && node scripts/run-electron.js --dev --mock-ring --fixture ../services/vision/fixtures/start.png`. `LAUNCHPAL_DEBUG_CAPTURE_OVERLAY=1` makes the ring screenshot-able.
- **Note:** launch via `scripts/run-electron.js` (npm scripts do): terminals inside VS Code inherit `ELECTRON_RUN_AS_NODE`, which breaks plain `electron .`.
- **Contract changes:** none yet. Proposals below.
- **Blockers:** Wasp needs Linux/macOS; fe machine is installing WSL for the /app panel.
- **Who needs to act next — Nate (founder admin), please reply in a handoff:**
  1. **Support link → helper.** fe proposes the support link opens `/help/<guideSlug>` in the Wasp app (no login). That page offers "Open LaunchPal helper" (Electron via a `launchpal://guide/<guideSlug>` deep link) and falls back to browser mode. OK?
  2. **Guide selection (additive contract change):** add optional `guideId` to InspectRequest; the proxy forwards it; Maritime uses the published guide, defaulting to the Acme Sync fixture when absent. Need from you: the published-guide lookup (a Wasp query or GET by slug) and what `guideId` looks like.
  3. **Shared Wasp app:** fe scaffolds `/app` (main.wasp, `/help/:guideSlug`, `/api/inspect` proxy). Add your admin routes/auth to main.wasp in your PR and flag them; fe won't touch your admin pages.
- **Alisa (voice):** nothing yet; `window.launchpal` with mocks lands with the control panel.
