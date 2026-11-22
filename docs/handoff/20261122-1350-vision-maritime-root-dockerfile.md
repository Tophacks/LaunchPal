# vision: Maritime repository-root Dockerfile

- **What changed:** Added a root-level `Dockerfile` to build and run only `services/vision/` from Maritime's mandatory repository-root build context. The existing service Dockerfile is retained for directory-local builds. Updated the vision status line.
- **Branch/PR:** `fix/maritime-root-dockerfile` (focused deployment fix).
- **What works:** Static review confirms the root Dockerfile installs locked dependencies, compiles the TypeScript service, includes `guide/`, and starts `dist/index.js`. The service already reads Maritime's injected `PORT` and binds `0.0.0.0`. No contract changes.
- **How to run/test:** Build from the repository root with `docker build -t launchpal-vision .`, then start with server-side `OPENAI_API_KEY` and `INSPECT_BEARER_TOKEN`. In Maritime select this repository and branch/main after merge, set the same variables on the agent Env tab, enable public URL, and deploy. Check `GET https://<agent-id>.mtm.sh/health` returns 200, then test authenticated `POST /inspect` with real fixtures.
- **Contract changes:** None. Existing `GET /health`, `POST /inspect`, optional `guideId`, response shape and bearer token unchanged.
- **Remaining blockers:** Maritime account/build logs and runtime variables cannot be verified via GitHub; no deployed endpoint or image-build result confirmed.
- **Who needs to act next:** Nate/Maritime admin: set the secrets, trigger deploy and inspect Builds; frontend: configure server-only `MARITIME_INSPECT_URL` and `MARITIME_TOKEN` to match the deployed endpoint and `INSPECT_BEARER_TOKEN`.
