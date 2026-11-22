# fe: vision service live on Render, proxy pointed at it

- **What changed:** Vision service deployed on Render as `launchpal-vision` (Docker, repo-root Dockerfile, free plan, health check `/health`): **https://launchpal-vision.onrender.com**. Render env: `OPENAI_API_KEY`, `INSPECT_BEARER_TOKEN` (values shared privately, never in git). Wasp `.env.server`: `MARITIME_INSPECT_URL=https://launchpal-vision.onrender.com`, `MARITIME_TOKEN=<same token>`. `.env.server.example` now points at the Render URL.
- **Branch/PR:** feat/frontend.
- **What works (real model via hosted service):** start → "Click Connect workspace.", blocked → "Click Allow access.", success → done, unrelated → unclear (1.6–4 s each).
- **How to run/test:** `curl https://launchpal-vision.onrender.com/health`; then run the app with the env above and `cd desktop && npm run fixture-demo`.
- **Gotcha found:** `OPENAI_API_KEY` on Render first held the Maritime key → OpenAI 401 → proxy 502. Fixed.
- **Contract changes:** none.
- **Blockers / risks:** free plan sleeps after ~15 min idle (first call ~50 s): switch to Starter or warm `/health` before the demo.
- **Who needs to act next:** Nate: FYI the hosted vision service is on Render (not Maritime) for now; get the token from Ahnaf privately. Alisa: real ElevenLabs key + live voice pass on the fe laptop.
