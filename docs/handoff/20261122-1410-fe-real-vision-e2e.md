# fe: real vision end to end (M7 part 1)

- **What changed:** Ran Nate's merged service (gpt-5.4) locally behind the Wasp proxy with mocks off. Fake-installer window now loads fixture files directly (the 1920×1080 set was too big for a data URL); `npm run fixture-demo` uses `services/vision/fixtures/screen/`. Mock targets updated to the real model's boxes on those frames. Control window 360×560 (no scrollbar).
- **Branch/PR:** feat/frontend.
- **What works (REAL model):** via proxy: start → "Click Connect workspace.", blocked → "Click Allow access.", success → done, unrelated / installer-behind → unclear "Please bring the Acme Sync setup window to the front." (1.4–2.7 s each). On screen: guided setup rings Connect workspace → Allow access → "Setup complete ✅", rings exactly on the buttons, 3 step events, 3 inspect calls.
- **How to run/test:** vision: `cd services/vision && npm run dev` with `.env` (`INSPECT_BEARER_TOKEN`, `OPENAI_API_KEY`). app `.env.server`: `MARITIME_INSPECT_URL=http://localhost:8080`, `MARITIME_TOKEN=<same token>`; `.env.client`: `REACT_APP_MOCK_INSPECT=false`. Then `cd desktop && npm run fixture-demo` → Start guided setup → click the screenshot.
- **Contract changes:** none.
- **Blockers:** no Maritime deployment URL yet (running vision locally). OpenAI account limits now 5000 req/min (billing on).
- **Who needs to act next:** Nate: deploy to Maritime, share URL + token. Alisa: voice (see VoiceSession.tsx).
