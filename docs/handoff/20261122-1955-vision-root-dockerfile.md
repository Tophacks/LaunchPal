# vision: repo-root Dockerfile for the Maritime build

- **What changed:** added root `Dockerfile` + `.dockerignore` (build services/vision from the repo root). `services/vision/Dockerfile` unchanged. Shared root files: nobody else uses a root Dockerfile today; `.dockerignore` excludes desktop/app/docs so the build context stays small. Flagging for fe.
- **Why:** Nate's first Maritime deploy failed at "Build image" (CodeBuild FAILED). The visible log tail was post-failure noise; likely cause is a repo-root build context where `COPY package.json` found nothing. Unconfirmed until we see the top of the log.
- **Branch/PR:** claude/launchpal-vision-backend-6de3fn.
- **What works:** simulated the Dockerfile steps in a clean dir containing only the COPY'd files: `npm ci`, build, prune, start, `GET /health` -> `{"ok":true}`. The real `docker build` has NOT been run (no Docker daemon in the agent sandbox).
- **How to run/test:** `docker build -t launchpal-vision . && docker run -e PORT=8080 -e INSPECT_BEARER_TOKEN=x -e OPENAI_API_KEY=x -p 8080:8080 launchpal-vision`.
- **Contract changes:** none.
- **Blockers:** need Maritime build log lines 1-107 (use "Copy log") if the retry still fails; secrets `OPENAI_API_KEY`, `INSPECT_BEARER_TOKEN` must be set in Maritime.
- **Who needs to act next:** Nate - pull/merge, click Retry deploy, paste log if it fails.
