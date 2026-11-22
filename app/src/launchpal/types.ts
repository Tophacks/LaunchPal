// Canonical LaunchPal contract types (see AGENTS.md "Inspection contract"). Use these everywhere.
// Contract changes are additive only and must be flagged to all owners first.

/** Fractions of the captured full-screen image, origin top-left. */
export interface Target {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InspectRequest {
  frameId: string;
  imageDataUrl: string;
  question: string;
  /** Optional (additive, agreed in PR #4): the published guide's slug. Absent = default guide (Acme Sync). */
  guideId?: string;
}

/** guideId format accepted by Maritime. */
export const GUIDE_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export interface InspectResponse {
  frameId: string;
  status: "point" | "unclear" | "done";
  instruction: string;
  target: Target | null;
}

export const QUESTION_ASK = "Where do I click?";
export const QUESTION_GUIDED = "What is the next step?";

export type LaunchpalMode = "desktop" | "browser";

export type StatusKind = "ready" | "guiding" | "looking" | "point" | "unclear" | "done" | "error";

export interface LaunchpalStatus {
  kind: StatusKind;
  /** Short status-strip text, e.g. "Looking…". */
  text: string;
  /** Latest instruction from an inspection, if any. */
  instruction?: string;
  guided: boolean;
}

/** Public API on window.launchpal (used by the voice owner's inspect_screen tool). */
export interface LaunchpalApi {
  mode: LaunchpalMode;
  /** Rejects with an Error whose message is safe to show/speak (e.g. "Couldn't check your screen — try again."). */
  inspectScreen(question: string): Promise<InspectResponse>;
  startGuided(): void;
  stopGuided(): void;
  readonly guided: boolean;
}

/** window CustomEvent dispatched by guided mode; detail is the InspectResponse. */
export const STEP_EVENT = "launchpal:step";

declare global {
  interface Window {
    launchpal?: LaunchpalApi;
    launchpalNative?: LaunchpalNative;
  }
  interface WindowEventMap {
    "launchpal:step": CustomEvent<InspectResponse>;
  }
}

// ---- Electron preload bridge (desktop/src/preload.ts) ----

export interface NativeFail {
  ok: false;
  code: string;
  message: string;
}

export interface NativeFrame {
  imageDataUrl: string;
  width: number;
  height: number;
  blank: boolean;
}

export interface NativeThumb {
  width: number;
  height: number;
  gray: number[];
}

export interface LaunchpalNative {
  platform: string;
  captureFrame(): Promise<{ ok: true; frame: NativeFrame } | NativeFail>;
  captureThumb(): Promise<{ ok: true; thumb: NativeThumb; exclude: Target | null } | NativeFail>;
  showRing(target: Target, label?: string): Promise<void>;
  clearRing(): Promise<void>;
}
