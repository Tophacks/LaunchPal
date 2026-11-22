# LaunchPal

LaunchPal helps founders onboard customers. A desktop helper watches the customer's screen, draws a ring around the next control to click **on their real screen**, and speaks the step. The customer clicks; LaunchPal never controls the computer. See [AGENTS.md](AGENTS.md) for the product, owners and contracts.

```
screen ──(Electron capture)──► Wasp server /api/inspect ──► vision service (Render) ──► OpenAI
                                                                     │
ring on the real screen + panel + ElevenLabs voice ◄── "Click Allow access." + box
```

## Demo (recording checklist)

Runs on the frontend laptop (Windows + WSL). Everything below was verified end to end with the real vision model and voice.

**Before recording (5 min)**
1. Wake the vision service (the free Render plan sleeps after ~15 min idle): open https://launchpal-vision.onrender.com/health and wait for `{"ok":true}`.
2. Start the Wasp app in Ubuntu (WSL): `bash /mnt/c/Users/<you>/OneDrive/Documents/Hackathon/LaunchPal/scripts/wsl-sync-app.sh && cd ~/lp-app && wasp start` (on Mac/Linux: `cd app && wasp start`). Wait for `Server listening on port 3001`.
   - `app/.env.server` must contain `MARITIME_INSPECT_URL`, `MARITIME_TOKEN`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`; `app/.env.client` must have `REACT_APP_MOCK_INSPECT=false`.
3. In a normal terminal (not VS Code's): `cd desktop && npm run demo`. The Acme Sync setup screen fills the screen (a click-through stand-in for the installer) and the LaunchPal panel sits in the corner. The panel must **not** show a `MOCK` badge.
4. Turn the speakers on.

**Script (~90 s)**
1. *"Customers get stuck installing software. LaunchPal sits next to the installer and shows them exactly where to click."*
2. Press **Talk** (allow the microphone). Guided mode starts. After ~3 s a pink ring appears around **Connect workspace** and the voice says "Click Connect workspace."
3. Click the screen (anywhere advances the stand-in installer). The ring disappears, and ~4 s later moves to **Allow access** by itself and the voice says it.
4. Optional: ask out loud **"Why does it need access?"** The agent answers from the founder's guide (rehearse this one first).
5. Click again. The panel shows **Setup complete ✅** and the voice confirms. Guiding stops by itself.
6. Unclear case: press **Ask: Where do I click?** with another app in front (or after closing the stand-in). LaunchPal says "Please bring the Acme Sync setup window to the front."

**If something goes wrong**
- "Couldn't check your screen — try again." → the vision service was asleep or slow; press **Ask: Where do I click?** again.
- No voice → press **End voice**, then **Talk** again; check `ELEVENLABS_*` in `app/.env.server`.
- Quit the helper: close the panel or press **Ctrl+Alt+Shift+Q**.

**Browser fallback** (no helper): open http://localhost:3000/help/acme-sync in Chrome, press **Start guided setup**, share **Entire screen**. The ring is drawn on the in-page preview.

## Setup (everyone, once per clone)

```bash
git config core.hooksPath scripts/githooks
```

This installs the pre-commit hook that rejects commits without a new `docs/handoff/*.md` note.

## Wasp app (`app/`)

Wasp runs on Linux/macOS only. On Windows use WSL; `scripts/wsl-sync-app.sh` mirrors `app/` into `~/lp-app`, where Wasp runs.

```bash
cd app
cp .env.client.example .env.client   # REACT_APP_MOCK_INSPECT=true for scripted answers, false for real vision
cp .env.server.example .env.server   # fill in secrets (never commit)
wasp install
wasp start                           # panel http://localhost:3000, server http://localhost:3001
```

Routes: `/` and `/help/:guideSlug` (control panel, no login), `POST /api/inspect` (proxy to the vision service), `GET /api/inspect/health`, action `getElevenLabsToken`.

## Desktop helper (Electron, `desktop/`)

```bash
cd desktop
npm install
npm run demo          # helper + full-screen Acme Sync stand-in installer (click to advance)
npm start             # helper only, panel at LAUNCHPAL_PANEL_URL (default http://localhost:3000)
npm run test-rings    # rings at the centre and corners of the primary screen
npm run dev           # dev shortcuts: Ctrl+Alt+Shift+R test rings, +M mock ring, +C clear, +Q quit
```

The overlay is click-through and excluded from screen captures. Always launch through the npm scripts (`scripts/run-electron.js`), because terminals inside VS Code inherit `ELECTRON_RUN_AS_NODE`. `launchpal://guide/<slug>` opens the helper on that guide.

**macOS:** grant Screen Recording (System Settings → Privacy & Security → Screen Recording) to the helper, then restart it. Without it, captures come back blank and the panel says so.

## Layout

- `services/vision/` — vision inspection service, deployed on Render as `launchpal-vision` (Nate)
- `app/` — Wasp control panel, server proxy, browser fallback (frontend)
- `desktop/` — Electron helper: capture, on-screen ring overlay, control window (frontend)
- `app/src/voice/`, `voice/` — ElevenLabs voice agent (Alisa)
- `docs/STATUS.md`, `docs/handoff/` — coordination
