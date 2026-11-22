// Mirrors app/src/launchpal/types.ts (the canonical contract types). Keep in sync; additive changes only.

/** Fractions of the captured full-screen image, origin top-left. */
export interface Target {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Ring {
  target: Target;
  label?: string;
}

export interface CapturedFrame {
  imageDataUrl: string;
  width: number;
  height: number;
  /** true when the capture looks blank (e.g. macOS Screen Recording permission missing). */
  blank: boolean;
}
