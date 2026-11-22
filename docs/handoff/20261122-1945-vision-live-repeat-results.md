# vision: repeated live results after OpenAI billing

- **What changed:** README live-results section updated; STATUS. No code changes.
- **Branch/PR:** claude/launchpal-vision-backend-6de3fn (follow-up to merged PR #4).
- **What works:** OpenAI account now 5000 req/min, 1M tok/min. Real gpt-5.4 (low effort), 7 full-screen fixtures x 5 runs: 35/35 expected status, box IoU mean 0.95 / min 0.92, latency p50 2.2 s, p90 2.9 s, max 3.1 s. Window set (1280x800) also 6/6 live.
- **How to run/test:** `cd services/vision && NODE_USE_ENV_PROXY=1 OPENAI_API_KEY=... INSPECT_BEARER_TOKEN=... npm run verify -- --set screen` (NODE_USE_ENV_PROXY only in the agent sandbox).
- **Contract changes:** none.
- **Blockers:** no Maritime deployment, so no endpoint URL; latency is service->OpenAI only (not a real helper capture over the network); fixtures are synthetic.
- **Who needs to act next:** Nate - Maritime access + secrets (`OPENAI_API_KEY`, `INSPECT_BEARER_TOKEN`) to deploy; then fe sets MARITIME_INSPECT_URL/MARITIME_TOKEN and runs an end-to-end capture.
