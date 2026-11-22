# LaunchPal agent coordination

LaunchPal helps software founders onboard customers. A customer shares a setup window and asks where to click. LaunchPal inspects a snapshot, highlights a control in the shared preview, and explains the next step aloud. The customer clicks and types. A fresh snapshot can verify progress.

## Three owners

| Role | Owns | First handoff |
| --- | --- | --- |
| Frontend and integration | Wasp/React screen sharing, frame capture, preview overlay, and Wasp server proxy. Owns final integration. | Render a highlight from a mock response and expose the browser inspection function to the voice teammate. |
| Maritime and vision (Nate) | Node/TypeScript inspection service, founder setup guide, screenshot fixtures, and Maritime deployment. | Share the endpoint, required environment variable names, and sample results for the starting, blocked, and success screens. |
| ElevenLabs and demo | Voice agent configuration, `inspect_screen` client tool, volunteer test, and demo recording. | Get “Where do I click?” to call the tool and speak a mock instruction. |

## Working together

- Read this file and check open PRs before editing. Claim one role and announce your branch in the team channel or PR. Use a feature branch or worktree and keep changes scoped to your role.
- Build against the contract below with mocks while other components are in progress. Keep ownership of shared Wasp entry points with the frontend owner. The voice owner can build the voice adapter independently and coordinate its registration with frontend.
- Flag any change to the contract, shared files, or demo setup flow to affected owners in the PR before changing it. Keep one agreed demo flow and reuse its fixtures across branches.
- In each handoff, include the branch or PR, what works, how to run or test it, remaining blockers, and who needs to act next. Share configuration names and endpoint URLs. Keep actual keys and tokens in server-side configuration.

## Inspection contract

The ElevenLabs client tool `inspect_screen` accepts a customer question. Its browser handler captures a fresh frame and calls the Wasp server proxy. The proxy calls Maritime `POST /inspect` using a shared bearer token.

Request fields: `frameId` (unique string), `imageDataUrl` (JPEG or PNG data URL, up to 2 MB decoded), and `question` (string).

Example response:

```json
{
  "frameId": "frame-123",
  "status": "point",
  "instruction": "Click Connect workspace.",
  "target": { "x": 0.72, "y": 0.80, "width": 0.19, "height": 0.08 }
}
```

- `point` requires a target. Use fractions of the captured image, with origin at the top left. The box must be fully inside the image and have positive dimensions.
- `unclear` uses `target: null` and asks for a specific clearer view. `done` uses `target: null` and requires visible success evidence from the guide.
- Echo the request's `frameId`. The frontend draws over the matching snapshot and clears the overlay on a new capture or when sharing stops. The voice tool returns the instruction and status to ElevenLabs. Screenshots stay within the inspection path and out of logs and persistent storage.
- Maritime exposes `GET /health`. Return an HTTP error for malformed requests or service failures so the proxy can surface a retry message.

## Demo acceptance

Use one product, one setup blocker, and one verifiable success screen. A volunteer shares a window, asks where to click, sees the highlight, and hears the matching instruction. After the volunteer clicks, inspect a fresh frame and confirm completion only if the guide's success evidence is visible. Test an unrelated or cropped screenshot and confirm the agent asks for a clearer view.
