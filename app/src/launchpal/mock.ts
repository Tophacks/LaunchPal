// Mock inspection (REACT_APP_MOCK_INSPECT=true). Scripted Acme Sync flow matching the full-screen fixtures in
// services/vision/fixtures/screen/ (targets = real gpt-5.4 answers on those frames). Echoes the request frameId.
import type { InspectRequest, InspectResponse } from "./types";

type Scripted = Omit<InspectResponse, "frameId">;

export const MOCK_SEQUENCE: Scripted[] = [
  {
    status: "point",
    instruction: "Click Connect workspace.",
    target: { x: 0.532, y: 0.319, width: 0.091, height: 0.039 },
  },
  {
    status: "point",
    instruction: "Click Allow access.",
    target: { x: 0.609, y: 0.54, width: 0.067, height: 0.04 },
  },
  { status: "done", instruction: "Your workspace is connected.", target: null },
];

export const MOCK_UNCLEAR: Scripted = {
  status: "unclear",
  instruction: "Please open the Acme Sync setup page and share that whole window.",
  target: null,
};

let step = 0;
let forceUnclear = false;

/** Dev button: the next mock inspection returns "unclear". */
export function mockNextUnclear() {
  forceUnclear = true;
}

export function resetMock() {
  step = 0;
  forceUnclear = false;
}

export async function mockInspect(req: InspectRequest): Promise<InspectResponse> {
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
  if (forceUnclear) {
    forceUnclear = false;
    return { frameId: req.frameId, ...MOCK_UNCLEAR };
  }
  const s = MOCK_SEQUENCE[Math.min(step, MOCK_SEQUENCE.length - 1)];
  step = step >= MOCK_SEQUENCE.length - 1 ? 0 : step + 1; // loop back after "done"
  return { frameId: req.frameId, ...s };
}
