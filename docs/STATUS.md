# Status (one line per owner; update yours on every commit)

- fe: Founder screen /founder + Python demo guide added; waiting on vision to accept guideText (2-line change, see 20261122-1445 note).
- vision (Nate): PR #4 merged. Vision works locally with gpt-5.4; prepared root Dockerfile for Maritime repository builds. Next: configure Maritime secrets, deploy and verify public /health and authenticated /inspect. No live Maritime endpoint yet.
- voice (Alisa): `feat/voice`: VoiceSession runs an ElevenLabs agent (WebRTC): `inspect_screen` client tool, step events spoken in sync with the ring, agent config in `voice/`. Unit-tested with a fake session only; not yet run against ElevenLabs (API key is `placeholder`) or inside Wasp. Next: real key, `node voice/setup-agent.mjs`, live pass, prompt tuning.
