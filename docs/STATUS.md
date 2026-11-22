# Status (one line per owner; update yours on every commit)

- fe: Real vision works end to end (desktop ring) + browser fallback (preview ring) works. Next: deploy Wasp app + npm run demo once Maritime URL is ready.
- voice (Alisa): `feat/voice`: VoiceSession runs an ElevenLabs agent (WebRTC): `inspect_screen` client tool, step events spoken in sync with the ring, agent config in `voice/`. Unit-tested with a fake session only; not yet run against ElevenLabs (API key is `placeholder`) or inside Wasp. Next: real key, `node voice/setup-agent.mjs`, live pass, prompt tuning.
- vision (Nate): PR #4 merged. Vision works locally with gpt-5.4; prepared root Dockerfile for Maritime repository builds. Next: configure Maritime secrets, deploy and verify public /health and authenticated /inspect. No live Maritime endpoint yet.
