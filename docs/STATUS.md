# Status (one line per owner; update yours on every commit)

- fe: DONE for demo: real vision (Render) + voice + desktop ring verified end to end; `npm run demo` + README recording checklist. Remaining optional: hosted Wasp app.
- vision (Nate): Inspection service live on Render (35/35 on real gpt-5.4, IoU mean 0.95, p50 2.2 s). Starting founder admin (guide upload/preview/publish/support link) in Wasp; Maritime deploy is no longer needed for vision.
- voice (Alisa): `feat/voice`: VoiceSession runs an ElevenLabs agent (WebRTC): `inspect_screen` client tool, step events spoken in sync with the ring, agent config in `voice/`. Unit-tested with a fake session only; not yet run against ElevenLabs (API key is `placeholder`) or inside Wasp. Next: real key, `node voice/setup-agent.mjs`, live pass, prompt tuning.
