# fe: automatic capture + native bridge (M3)

- **What changed:** `desktop/src/capture.ts`: desktopCapturer grabs the full primary screen at native resolution, downscales to long edge ≤ 1920, JPEG 85 (re-encodes lower until ≤ 2 MB), flags blank captures; macOS missing Screen Recording → "Grant Screen Recording in System Settings, then restart LaunchPal." Cheap 64×36 grayscale thumb for guided-mode change detection. Control window (360×480, always on top, bottom-right; jumps to the opposite corner if the ring would overlap) loads `LAUNCHPAL_PANEL_URL` (default http://localhost:3000) with a preload exposing `window.launchpalNative` { platform, captureFrame, captureThumb, showRing, clearRing }. Offline page with retry if the panel URL is unreachable. Mic permission allowed for the panel origin only.
- **Branch/PR:** feat/frontend.
- **What works:** capture on Windows: 1920×1080, ~620 KB, ~1.2 s, not blank. Ring is cleared before capture and content-protected.
- **How to run/test:** `cd desktop && npm run dev-panel` → Capture screen / Mock ring / Change-detect thumb / Clear.
- **Contract changes:** none.
- **Blockers:** Wasp /app waits on WSL on the fe machine.
- **Who needs to act next:** Nate: questions in 20261122-1300-fe-overlay-ring.md still open.
