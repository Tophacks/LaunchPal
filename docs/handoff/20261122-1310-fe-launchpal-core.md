# fe: window.launchpal core (inspection, guided mode, step events)

- **What changed:** `app/src/launchpal/` (framework-free TS, drops into the Wasp app): `types.ts` (canonical contract types + `window.launchpal` / `launchpal:step` typings), `launchpal.ts` (inspectScreen steps 1–8, frameId latest-only, guided mode: 2 s 64×36 change detection ignoring the control window, ~1 s settle, one request in flight, ≥ 3 s apart, ring cleared on change, step-event dedupe, stop on done), `mock.ts` (Acme Sync sample sequence: Connect workspace → Allow access → done, plus an "unclear" dev trigger), `inspectClient.ts` (POST /api/inspect, response validation, "Couldn't check your screen — try again."), `desktopAdapter.ts`.
- **Branch/PR:** feat/frontend.
- **What works:** headless simulation with mocks: start → step 1 event; screen change → step 2 event; change → done event, guided stops; 3 inspect calls total.
- **How to run/test:** not wired into a page yet (Wasp app next).
- **Contract changes:** none. For Alisa: `window.launchpal.inspectScreen(q)` **rejects** with an Error whose `message` is safe to speak (e.g. "Couldn't check your screen — try again.").
- **Blockers:** Wasp /app waits on WSL on the fe machine.
- **Who needs to act next:** Nate: questions in 20261122-1300-fe-overlay-ring.md.
