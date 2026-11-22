# Status (one line per owner; update yours on every commit)

- fe: Real vision works end to end (desktop ring) + browser fallback (preview ring) works. Next: deploy Wasp app + npm run demo once Maritime URL is ready.
- vision (Nate): PR #4 open. Live model works: gpt-5.4 (low effort) boxes ~pixel-accurate, ~2.5 s/call. Blocked by OpenAI free-tier limits (3 req/min): add a payment method. No Maritime endpoint yet.
- voice (Alisa): `feat/voice`: VoiceSession runs an ElevenLabs agent (WebRTC): `inspect_screen` client tool, step events spoken in sync with the ring, agent config in `voice/`. Unit-tested with a fake session only; not yet run against ElevenLabs (API key is `placeholder`) or inside Wasp. Next: real key, `node voice/setup-agent.mjs`, live pass, prompt tuning.
