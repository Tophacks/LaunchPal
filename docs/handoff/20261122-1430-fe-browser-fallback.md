# fe: browser fallback (M7)

- **What changed:** In a plain browser (no Electron), the panel shares the screen with `getDisplayMedia` (prefers "entire screen"), captures frames from the stream (≤ 1920 px JPEG, ≤ 2 MB), runs the same guided-mode change detection, and draws the ring on a live in-page preview using object-fit: contain letterbox math. Stop also stops sharing; ending sharing from the browser bar stops guiding with "Screen sharing stopped…". "Open LaunchPal helper" (launchpal:// link) stays as the upgrade path.
- **Branch/PR:** feat/frontend.
- **What works (Chrome, real vision):** `/help/acme-sync` → Start guided setup → share screen → "Click Connect workspace." with the ring exactly on the button in the preview.
- **How to run/test:** open http://localhost:3000/help/acme-sync in Chrome/Edge, press Start guided setup, choose Entire screen.
- **Contract changes:** none.
- **Known limit:** browsers throttle timers in background tabs, so guided mode may react a little slower while the installer is in front. The desktop helper is the primary path.
- **Who needs to act next:** Nate: Maritime URL + token when deployed. Alisa: voice.
