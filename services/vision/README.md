# LaunchPal vision service

Node/TypeScript service behind the Wasp proxy. Implements the contract in [`/AGENTS.md`](../../AGENTS.md):
`GET /health` and `POST /inspect`. Owner: Nate (Maritime and vision).

## Endpoint

- Deployed URL: **not deployed yet** (see PR blockers). Will be shared in the PR once Maritime is configured.
- Auth: `Authorization: Bearer <INSPECT_BEARER_TOKEN>` on `/inspect`. `/health` is open.

## Environment variables

| Name | Required | Notes |
| --- | --- | --- |
| `INSPECT_BEARER_TOKEN` | yes | Shared secret. Set the same value in the Wasp server (the proxy). |
| `OPENAI_API_KEY` | yes | Server-side only. |
| `OPENAI_MODEL` | no | Image-capable Responses API model. Default `gpt-4.1` (unverified against live API, see PR). |
| `OPENAI_TIMEOUT_MS` | no | Whole-request deadline incl. one validation retry. Default `12000` (kept below the Wasp proxy's 15 s timeout so the proxy gets a clean 504 instead of timing out itself). |
| `PORT` | no | Listen port. Default `8080`. Maritime should inject it. |
| `DEFAULT_GUIDE_ID` | no | Guide used when the request has no `guideId`. Default `acme-sync` (`guide/<id>.md`). |
| `GUIDE_PATH` | no | Overrides the default guide file path. |

## Run

```bash
cd services/vision && npm ci
cp .env.example .env   # fill in
npm run dev            # or: npm run build && npm start
npm test               # unit + HTTP tests, mock model, no network
npm run fixtures       # re-render screenshot fixtures (Playwright/Chromium)
npm run fixtures:screen    # re-render the 1920x1080 full-screen fixtures
npm run verify -- --mock --set screen   # pipeline check; omit --mock with OPENAI_API_KEY set for the real model
                                        # --set window = the original 1280x800 window captures
BASE_URL=https://... INSPECT_BEARER_TOKEN=... npm run verify   # against a deployed service
```

Note for the agent sandbox only: Node's `fetch` ignores the proxy there, so run live checks with `NODE_USE_ENV_PROXY=1`.

Wasp proxy mapping: proxy `MARITIME_INSPECT_URL` = this service's base URL, proxy `MARITIME_TOKEN` = this service's `INSPECT_BEARER_TOKEN` (same value).

Docker: `docker build -t launchpal-vision services/vision` (context is `services/vision`).

## Sample request

```bash
curl -sS -X POST "$BASE_URL/inspect" \
  -H "authorization: Bearer $INSPECT_BEARER_TOKEN" -H "content-type: application/json" \
  -d "{\"frameId\":\"frame-123\",\"question\":\"Where do I click?\",\"imageDataUrl\":\"data:image/png;base64,$(base64 -w0 fixtures/start.png)\"}"
```

Optional additive field: `"guideId": "acme-sync"` (`^[a-z0-9][a-z0-9-]{0,63}$`). Absent = default guide; unknown id = 404 `guide_not_found`.
`question` is `"Where do I click?"` or `"What is the next step?"` (both mean: one next action).

## Sample responses (build against these)

**Full-screen captures** (what the desktop helper sends; `fixtures/screen/*.png`, 1920x1080). Use these for the Electron overlay:
```json
{ "frameId": "f1", "status": "point", "instruction": "Click Connect workspace.",
  "target": { "x": 0.5356, "y": 0.3178, "width": 0.0898, "height": 0.0389 } }
```
Blocked (`screen/blocked.png`): `"Click Allow access."` target ≈ `{ "x": 0.612, "y": 0.538, "width": 0.067, "height": 0.039 }`.
Installer hidden or off-screen (`screen/behind.png`, `screen/offscreen.png`): `unclear`, `"Please bring the Acme Sync setup window to the front."`, `target: null`.
Exact DOM ground-truth boxes are in `fixtures/screen/truth.json`.

**Window captures** (original 1280x800, `fixtures/*.png`; unchanged so existing mocks and `--fixture ../services/vision/fixtures/start.png` still align):

Starting screen (`fixtures/start.png`):
```json
{ "frameId": "frame-123", "status": "point", "instruction": "Click Connect workspace.",
  "target": { "x": 0.552, "y": 0.266, "width": 0.135, "height": 0.053 } }
```
Blocked screen, permission dialog (`fixtures/blocked.png`):
```json
{ "frameId": "frame-124", "status": "point", "instruction": "Click Allow access.",
  "target": { "x": 0.667, "y": 0.562, "width": 0.1, "height": 0.053 } }
```
Success (`fixtures/success.png`):
```json
{ "frameId": "frame-125", "status": "done", "instruction": "Your workspace is connected.", "target": null }
```
Cropped or unrelated screen (`fixtures/cropped.png`, `fixtures/unrelated.png`):
```json
{ "frameId": "frame-126", "status": "unclear",
  "instruction": "Please bring the Acme Sync setup window to the front.", "target": null }
```
These are scripted examples of the contract, not captured model output.

Errors are `{ "error": { "code", "message" } }`: 400 `invalid_request`/`invalid_json`/`invalid_image`, 401 `unauthorized`,
404 `guide_not_found`, 413 `image_too_large` (>2 MB decoded), 415, 502 `upstream_error`/`invalid_upstream_response`, 504 `upstream_timeout`.

## How it works

1. Validates body, auth, and image (JPEG/PNG magic bytes + declared type, <= 2 MB decoded).
2. Calls the OpenAI Responses API (`store: false`) with the screenshot, question and guide, using strict JSON-schema output.
3. The model returns the box as integers on a 1000x1000 grid over the whole image; the server converts to fractions
   (origin top-left), checks positive size and full containment, and checks `point` instructions contain the control's visible
   label, `unclear`/`done` have `target: null`, and `done` cites success evidence. One retry on invalid output, then 502.
4. `frameId` is attached from the request in server code, never taken from the model.

Screenshots are never written to disk or logged; logs contain request id, frameId, status and latency only.
Screenshot text is treated as evidence about the UI; the guide is the only source of workflow.

## Demo product (fixture)

`guide/acme-sync.md` describes **Acme Sync**, a clearly labelled fixture product. Flow: **Connect workspace** →
blocker dialog **Allow access** → success screen "Workspace connected" + "Sync status: Active". To use a real product, replace the guide
and re-render/replace the fixtures; no code changes.

## Live results (gpt-5.4, reasoning effort low, 1920x1080 fixtures)

Real OpenAI model, in-process, production defaults (12 s timeout), 2026-11-22. IoU is the returned box vs the DOM bounding box of the intended control.

**Repeated run: 7 fixtures x 5 runs = 35 calls (alternating both helper questions): 35/35 returned the expected status.** Box IoU: mean 0.95, min 0.92. Latency: p50 2.2 s, p90 2.9 s, max 3.1 s.

| fixture | expected | result |
|---|---|---|
| start | point | "Click Connect workspace." |
| blocked | point | "Click Allow access." (never Cancel) |
| success | done, target null | "Setup is complete." |
| loading (spinner) | unclear | "Please wait for Acme Sync to finish connecting." |
| offscreen | unclear | "Please drag the Acme Sync setup window fully onto the screen." |
| behind | unclear | "Please bring the Acme Sync setup window to the front." |
| unrelated | unclear | "Please bring the Acme Sync setup window to the front." |

The original 1280x800 window set also passes live (6/6, single run, includes `cropped` -> "Please show the whole Acme Sync setup window.").

Model comparison: gpt-4.1 read the screens correctly but its boxes were off by ~5% of the screen (blocked: 642,490 vs truth 609,540 on the 1000 grid), so it is not usable for the ring. gpt-5.5 matches gpt-5.4 on accuracy but takes 4-5 s.

Caveats: synthetic fixtures (one product, rendered by Chromium), not a real browser capture, so real-capture latency over a network from the helper is unmeasured; latency is service-to-OpenAI only. On the account's earlier free tier (3 req/min) calls were rate limited; after billing the limits are 5000 req/min and 1M tokens/min.
