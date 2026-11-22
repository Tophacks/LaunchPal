# vision: first live-model results, default model gpt-5.4

- **What changed:** default `OPENAI_MODEL` gpt-4.1 -> **gpt-5.4** with `OPENAI_REASONING_EFFORT=low` (auto for gpt-5*/o*; sent only when set). OpenAI 429 now maps to HTTP 503 `upstream_rate_limited`; upstream error messages include OpenAI's status/code (never image data). `max_output_tokens` 2000 (reasoning tokens count). `verify` script has `VERIFY_GAP_MS` pacing.
- **Branch/PR:** claude/launchpal-vision-backend-6de3fn, PR #4.
- **What works (REAL model, 1920x1080 fixtures):** gpt-4.1 read labels right but boxes were off ~5% of the screen (blocked: got 642,490 vs truth 609,540 on a 1000 grid) - unusable for a ring. gpt-5.4/5.5 low effort: boxes within ~1/1000 of truth (start IoU 0.95, blocked IoU 0.97), ~2.3-2.9 s per call (5.5 is slower, ~4-5 s). `done` on the success screen verified with gpt-4.1.
- **How to run/test:** `cd services/vision && npm test` (17 pass). Live: `OPENAI_API_KEY=... INSPECT_BEARER_TOKEN=... npm run verify -- --set screen`. In the agent sandbox add `NODE_USE_ENV_PROXY=1`.
- **Contract changes:** none.
- **Blockers:** OpenAI account is on a very low tier: **3 requests/min and 10k tokens/min for gpt-5.4**. Guided mode will exceed this during a demo. Fix: add a payment method / raise the tier at platform.openai.com. Full 7-fixture live pass (unclear cases) still pending because of the limit. No Maritime endpoint yet.
- **Who needs to act next:** Nate - add payment method (rate limits), Maritime access. fe - expect 503 `upstream_rate_limited` possible; proxy already maps non-OK to a retry message.
