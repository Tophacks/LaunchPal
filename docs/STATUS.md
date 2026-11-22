# Status (one line per owner; update yours on every commit)

- fe: DONE for demo: real vision (Render) + voice + desktop ring verified end to end; `npm run demo` + README recording checklist. Remaining optional: hosted Wasp app.
- vision (Nate): PR #4 merged. Vision works locally with gpt-5.4; prepared root Dockerfile for Maritime repository builds. Next: configure Maritime secrets, deploy and verify public /health and authenticated /inspect. No live Maritime endpoint yet.
- voice (Alisa): `feat/voice`: VoiceSession runs an ElevenLabs agent (WebRTC): `inspect_screen` client tool, step events spoken in sync with the ring, agent config in `voice/`. Unit-tested with a fake session only; not yet run against ElevenLabs (API key is `placeholder`) or inside Wasp. Next: real key, `node voice/setup-agent.mjs`, live pass, prompt tuning.
