# LaunchPal

LaunchPal helps founders onboard customers: a desktop helper watches the customer's screen, draws a ring around the next control to click on their real screen, and speaks the step. See [AGENTS.md](AGENTS.md) for the product, owners and contracts.

## Setup (everyone, once per clone)

```bash
git config core.hooksPath scripts/githooks
```

This installs the pre-commit hook that rejects commits without a new `docs/handoff/*.md` note.

## Layout

- `services/vision/` — Maritime inspection service (Nate)
- `app/` — Wasp control panel, server proxy, browser fallback (frontend)
- `desktop/` — Electron helper: capture, on-screen ring overlay, control window (frontend)
- `app/src/voice/`, `voice/` — ElevenLabs voice agent (voice owner)
- `docs/STATUS.md`, `docs/handoff/` — coordination
