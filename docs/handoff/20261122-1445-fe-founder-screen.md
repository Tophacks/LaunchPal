# fe: founder screen (/founder) + Python for Windows demo guide

- **What changed:** Founder screen at `/founder` (owner now: Ahnaf/fe, not Nate): product name, upload .md or paste guide (or "Use example: Python"), Publish → customer link `/help/<slug>` + "Open in LaunchPal helper". Published guides kept in server memory (hackathon). The proxy sends a published guide to the vision service as optional `guideText` (omits guideId for those slugs). Example guide `app/src/founder/exampleGuides.ts`: real python.org installer for Windows (blocker: "Add python.exe to PATH").
- **What works:** compiles + type-checks; page loads.
- **BLOCKER — Nate (vision), please do now and push to main (Render auto-deploys):** accept the guide text:
  - `services/vision/src/schema.ts` in `InspectRequest`: `guideText: z.string().trim().min(1).max(20000).optional(),`
  - `services/vision/src/inspect.ts`: destructure `guideText` and use `const guide = guideText ?? (await deps.guides.get(guideId));`
  Until then the model ignores founder guides (zod strips the field) and uses the default Acme Sync guide.
- **Contract changes:** additive optional `guideText` on the proxy → vision request (needs vision to accept it).
- **Who needs to act next:** Nate: the 2 lines above. Alisa: the voice agent's prompt still embeds the Acme Sync guide; "why" questions about Python will be off.
