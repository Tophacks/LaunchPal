# vision: service timeout below the Wasp proxy timeout

- **What changed:** `OPENAI_TIMEOUT_MS` default 20000 -> 12000 so `/inspect` answers 504 before the proxy's 15 s abort. README notes the proxy env mapping (`MARITIME_INSPECT_URL`, `MARITIME_TOKEN` = `INSPECT_BEARER_TOKEN`).
- **Branch/PR:** claude/launchpal-vision-backend-6de3fn, PR #4.
- **What works:** 16/16 tests. Read `feat/frontend` proxy: request shape matches; `guideId` is not forwarded yet (optional, nothing breaks).
- **How to run/test:** `cd services/vision && npm test`.
- **Contract changes:** none (beyond the additive `guideId` already in #4).
- **Blockers:** OpenAI key is saved on the agent environment and works, but the account returns 429 `credit_balance_exhausted`, so no live accuracy/latency numbers. No Maritime endpoint yet.
- **Who needs to act next:** Nate - add OpenAI billing credits and Maritime access. fe - optionally forward `guideId` in the proxy once the guide slug is known.
