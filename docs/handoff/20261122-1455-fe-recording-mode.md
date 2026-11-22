# fe: recording mode (ring visible to screen recorders)

- **What changed:** `cd desktop && npm run demo:record` turns off the overlay content protection so screen recordings show the ring. The ring is still cleared before every inspection capture, and change detection now ignores the ring + label area as well as the control panel (exclude list).
- **What works:** builds + Wasp type-check pass.
- **Contract changes:** none (native captureThumb `exclude` may be an array; fe-internal).
- **Who needs to act next:** Alisa: record with `npm run demo:record`, then click "Open in LaunchPal helper" on /founder after publishing.
