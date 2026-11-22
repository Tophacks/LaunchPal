# Status (one line per owner; update yours on every commit)

- fe: Desktop ring + capture + guided mode + Wasp panel/proxy work with mocks; guideId, launchpal:// deep link and voice mount (VoiceSession stub for Alisa) added. Next: real vision when Maritime is up, browser fallback, deploy.
- vision (Nate): Live gpt-5.4 verified 35/35 (IoU mean 0.95, p50 2.2 s). First Maritime deploy FAILED at 'Build image'; added a repo-root Dockerfile (my guess: Maritime builds from repo root) - need the top of the build log to confirm. Next: retry deploy, share endpoint URL.
- voice: not started.
