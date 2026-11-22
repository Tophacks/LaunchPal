# vision: merge main, live results + .dockerignore

- **What changed:** merged `main` (Nate's PR #8 root Dockerfile, fe PRs #6/#7) into the vision branch. Kept main's root `Dockerfile` (identical build to mine). Added: root `.dockerignore` (keeps the root build context small), README live results (35/35 on real gpt-5.4, IoU mean 0.95, p50 2.2 s), STATUS.
- **Branch/PR:** claude/launchpal-vision-backend-6de3fn (no PR open yet).
- **What works:** vision service verified live against OpenAI; fe's end-to-end now consumes it. Dockerfile steps simulated in a clean dir -> `/health` ok (real `docker build` not run: no Docker daemon in the agent sandbox).
- **How to run/test:** `cd services/vision && npm test`; live: `NODE_USE_ENV_PROXY=1 OPENAI_API_KEY=... INSPECT_BEARER_TOKEN=... npm run verify -- --set screen`.
- **Contract changes:** none.
- **Blockers:** Maritime deploys fail at "Build image" (log tail only; root cause unseen - need Builds-tab log top). No public endpoint yet; fallback is any container host using the root Dockerfile.
- **Who needs to act next:** Nate - paste top of the Maritime build log, or deploy the root Dockerfile on Render; then send the URL to fe for MARITIME_INSPECT_URL/MARITIME_TOKEN.
