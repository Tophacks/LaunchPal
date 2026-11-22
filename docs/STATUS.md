# Status (one line per owner; update yours on every commit)

- fe: M2 on-screen ring overlay works (desktop/, verified on Windows). Next M3 automatic capture; /app support UI once WSL is up. Questions for Nate in 20261122-1300-fe-overlay-ring.md.
- vision (Nate): Inspection service (PR #4) handles full-screen captures + optional `guideId`; timeout default 12 s (< proxy's 15 s). OpenAI key is saved on the agent env but the account has no credits (429), so no live accuracy/latency yet; no Maritime endpoint yet. Next: live verify once billing is added, then deploy.
- voice: not started.
