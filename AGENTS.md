# LaunchPal agent coordination

LaunchPal helps software founders onboard customers. The customer runs a small LaunchPal desktop helper next to the founder's installer. The helper captures the screen automatically (the customer never takes screenshots or picks a window), inspects it against the founder's setup guide, draws a ring **on the customer's real screen** around the next control to click, and explains the step aloud. The customer clicks and types themselves; LaunchPal never controls the computer.

In **guided mode**, the helper watches for the screen to change. When it does, LaunchPal inspects a fresh frame, moves the ring to the next step and speaks it, until the guide's success evidence is visible. The customer can also ask "Where do I click?" at any time.

Fallback: if the desktop helper fails, the same Wasp app runs in a browser with `getDisplayMedia` and draws the ring on an in-page preview.

## Three owners

| Role | Owns | First handoff |
| --- | --- | --- |
| Frontend and integration | Electron desktop helper (automatic capture, click-through on-screen overlay, guided mode), Wasp/React control panel, browser fallback, and the Wasp server proxy. Owns final integration. | Draw a ring on the real screen from a mock response, and expose `window.launchpal` (inspection + step events) to the voice teammate. |
| Maritime and vision (Nate) | Node/TypeScript inspection service, founder setup guide, screenshot fixtures, and Maritime deployment. | Share the endpoint, required environment variable names, and sample results for the starting, blocked, and success screens. |
| ElevenLabs and demo | Voice agent configuration, `inspect_screen` client tool, speaking guided-mode step events, volunteer test, and demo recording. | Get "Where do I click?" to call the tool and speak a mock instruction, and speak a mock `launchpal:step` event unprompted. |

## Working together

- Read this file, `docs/STATUS.md`, the newest 5 notes in `docs/handoff/`, and open PRs before editing. Claim one role and work on a feature branch or worktree scoped to it.
- Build against the contract below with mocks while other components are in progress. Keep ownership of shared Wasp entry points and the Electron app with the frontend owner. The voice owner builds the voice adapter in its own file and coordinates its registration with frontend.
- Flag any change to the contract, shared files, or demo flow to affected owners in the PR before changing it. Contract changes are additive only (no renames or removals) unless all three owners agree. Keep one agreed demo flow and reuse its fixtures across branches.
- Merge small PRs into `main` often (at least every hour) so the others can integrate.

### Commit and handoff rule (every commit)

- Every commit adds a new note `docs/handoff/YYYYMMDD-HHMM-<role>-<slug>.md` (`<role>` is `fe`, `vision` or `voice`) and updates your line in `docs/STATUS.md`. Tiny fixes can use a 2–3 line note.
- Note format: what changed, branch or PR, what works, how to run or test it, contract changes (or "none"), remaining blockers, and who needs to act next.
- Push after every commit. Never end an agent turn with uncommitted or unpushed work. The Stop hook in `.claude/settings.json` (`scripts/require-clean-tree.sh`) enforces this against the branch's upstream (`@{u}`). The pre-commit hook (`scripts/githooks/pre-commit`) rejects commits without a new handoff note. Install it with `git config core.hooksPath scripts/githooks`.
- Share configuration names and endpoint URLs in handoffs. Keep actual keys and tokens in server-side configuration only.

## Inspection contract

The voice tool `inspect_screen` and guided mode both call `window.launchpal.inspectScreen(question)`. It clears the ring, captures a fresh frame (Electron `desktopCapturer` in desktop mode, the shared stream in browser mode), and calls the Wasp server proxy. The proxy calls Maritime `POST /inspect` using a shared bearer token.

Request fields: `frameId` (unique string), `imageDataUrl` (JPEG or PNG data URL of the **full primary screen**, long edge ≤ 1920 px, up to 2 MB decoded), and `question` (string: `"Where do I click?"` when the customer asks, `"What is the next step?"` in guided mode). Both questions expect exactly one next action.

Example response:

```json
{
  "frameId": "frame-123",
  "status": "point",
  "instruction": "Click Connect workspace.",
  "target": { "x": 0.72, "y": 0.80, "width": 0.19, "height": 0.08 }
}
```

- `point` requires a target. Use fractions of the captured image, with origin at the top left. The box must be fully inside the image and have positive dimensions. The image is the whole screen, so targets are small: ask for tight boxes, and prefer `unclear` over guessing.
- `unclear` uses `target: null` and asks for a specific clearer view (e.g. "Bring the installer window to the front"). `done` uses `target: null` and requires visible success evidence from the guide.
- Echo the request's `frameId`. The frontend draws the ring only for the latest frame, and clears it on a new capture, when the screen changes, or when guiding stops. The overlay is excluded from captures. Screenshots stay within the inspection path and out of logs and persistent storage.
- Maritime exposes `GET /health`. Return an HTTP error for malformed requests or service failures so the proxy can surface a retry message.

## Step events (guided mode)

- The frontend dispatches `window` CustomEvent `launchpal:step` with the inspection response as `detail` whenever guided mode finds a new step. It also dispatches the event for `unclear` (once) and for `done`. The same target and instruction are not re-announced.
- The voice owner speaks `detail.instruction` without the customer asking.
- `window.launchpal.startGuided()` / `stopGuided()` control guided mode. Starting a voice session starts guided mode.

## Demo acceptance

Use one product, one setup blocker, and one verifiable success screen. A volunteer opens the installer with the helper running, starts guided setup, sees the ring on their real screen around the right control, and hears the matching instruction. After each click, the ring moves to the next step on its own. Confirm completion only if the guide's success evidence is visible. Test an unrelated or cropped screen and confirm the agent asks for a clearer view.
