# fe: guideId, launchpal:// deep link, voice mount point (M6)

- **What changed:** (1) Optional `guideId` (agreed in PR #4): the panel sends the `/help/<slug>` slug; the proxy validates `^[a-z0-9][a-z0-9-]{0,63}$` and forwards it; Maritime 404 → "This setup guide isn't available…". (2) Electron registers `launchpal://`; `launchpal://guide/<slug>` opens/switches the helper to `/help/<slug>`; in a plain browser the panel shows "Open LaunchPal helper". (3) Wasp action `getElevenLabsToken` (server-side, env `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`); "Talk" button starts guided mode and mounts `app/src/voice/VoiceSession.tsx` (stub).
- **Branch/PR:** feat/frontend → main.
- **What works:** bad guideId → 400; token action → clean 503 when unset; deep link switches a running helper to the guide (verified on Windows).
- **How to run/test:** see 20261122-1320 note. Deep link: with the helper running, open `launchpal://guide/acme-sync` (Win+R works).
- **Contract changes:** additive optional `guideId` (agreed with vision in PR #4).
- **Blockers:** no Maritime URL/token yet; no ElevenLabs keys in fe env.
- **Who needs to act next:** **Alisa:** `app/src/voice/VoiceSession.tsx` is yours: replace the stub (header comment lists what's available); props `{ onEnd }`. Put ELEVENLABS_* in `app/.env.server`. **Nate:** merge PR #4; share the Maritime URL + token name when deployed.
