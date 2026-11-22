# vision: live model results recorded (7/7 fixtures)

- **What changed:** README "Live results" section + STATUS. No code changes.
- **Branch/PR:** claude/launchpal-vision-backend-6de3fn (follow-up to merged PR #4).
- **What works:** real gpt-5.4 (low effort) on all 7 full-screen fixtures: start/blocked boxes IoU 0.95/0.97, success=done, loading/offscreen/behind/unrelated=unclear with null target. ~2-3 s per call (one 8.3 s outlier on loading).
- **How to run/test:** `cd services/vision && NODE_USE_ENV_PROXY=1 OPENAI_API_KEY=... INSPECT_BEARER_TOKEN=... VERIFY_GAP_MS=21000 npm run verify -- --set screen` (gap only needed on the low-tier key).
- **Contract changes:** none.
- **Blockers:** OpenAI account limit 3 req/min (add a payment method); no Maritime endpoint; fixtures are synthetic, real browser capture + latency not yet measured; the window-set (1280x800) fixtures were not re-run live.
- **Who needs to act next:** Nate - OpenAI billing + Maritime access to deploy; then fe points MARITIME_INSPECT_URL at it.
