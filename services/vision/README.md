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
| `OPENAI_TIMEOUT_MS` | no | Whole-request deadline incl. one validation retry. Default `20000`. |
| `PORT` | no | Listen port. Default `8080`. Maritime should inject it. |
| `GUIDE_PATH` | no | Founder guide file. Default `guide/acme-sync.md`. |

## Run

```bash
cd services/vision && npm ci
cp .env.example .env   # fill in
npm run dev            # or: npm run build && npm start
npm test               # unit + HTTP tests, mock model, no network
npm run fixtures       # re-render screenshot fixtures (Playwright/Chromium)
npm run verify -- --mock   # pipeline check; omit --mock with OPENAI_API_KEY set for real model
BASE_URL=https://... INSPECT_BEARER_TOKEN=... npm run verify   # against a deployed service
```

Docker: `docker build -t launchpal-vision services/vision` (context is `services/vision`).

## Sample request

```bash
curl -sS -X POST "$BASE_URL/inspect" \
  -H "authorization: Bearer $INSPECT_BEARER_TOKEN" -H "content-type: application/json" \
  -d "{\"frameId\":\"frame-123\",\"question\":\"Where do I click?\",\"imageDataUrl\":\"data:image/png;base64,$(base64 -w0 fixtures/start.png)\"}"
```

## Sample responses (build against these)

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
  "instruction": "Please open the Acme Sync setup page and share that whole window.", "target": null }
```
These are scripted examples of the contract, not captured model output.

Errors are `{ "error": { "code", "message" } }`: 400 `invalid_request`/`invalid_json`/`invalid_image`, 401 `unauthorized`,
413 `image_too_large` (>2 MB decoded), 415, 502 `upstream_error`/`invalid_upstream_response`, 504 `upstream_timeout`.

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
