import type { Target } from "./types";

export interface Thumb {
  width: number;
  height: number;
  gray: ArrayLike<number>;
}

/** A pixel counts as changed if its gray level moved by more than this. */
const PIXEL_DELTA = 24;
/** The screen counts as changed if more than this fraction of (non-excluded) pixels changed. */
const CHANGED_FRACTION = 0.01;

/**
 * Compares two small grayscale frames, ignoring `exclude` (the LaunchPal control window, in fractions).
 * Returns the fraction of pixels that changed.
 */
export function changedFraction(a: Thumb, b: Thumb, exclude: Target | Target[] | null): number {
  if (a.width !== b.width || a.height !== b.height) return 1;
  const { width: w, height: h } = a;
  const boxes = (Array.isArray(exclude) ? exclude : exclude ? [exclude] : []).map((e) => ({
    x0: Math.floor(e.x * w) - 1,
    x1: Math.ceil((e.x + e.width) * w) + 1,
    y0: Math.floor(e.y * h) - 1,
    y1: Math.ceil((e.y + e.height) * h) + 1,
  }));
  let changed = 0;
  let counted = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (boxes.some((r) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1)) continue;
      const i = y * w + x;
      counted++;
      if (Math.abs(a.gray[i] - b.gray[i]) > PIXEL_DELTA) changed++;
    }
  }
  return counted ? changed / counted : 0;
}

export function hasChanged(a: Thumb, b: Thumb, exclude: Target | Target[] | null): boolean {
  return changedFraction(a, b, exclude) > CHANGED_FRACTION;
}

/** "New step" rule: a different instruction, or a target centre that moved more than 3% of the screen. */
export function isNewStep(
  prev: { instruction: string; target: Target | null; status: string } | null,
  next: { instruction: string; target: Target | null; status: string },
): boolean {
  if (!prev) return true;
  if (prev.status !== next.status) return true;
  if (prev.instruction.trim().toLowerCase() !== next.instruction.trim().toLowerCase()) return true;
  if (prev.target && next.target) {
    const dx = Math.abs(prev.target.x + prev.target.width / 2 - (next.target.x + next.target.width / 2));
    const dy = Math.abs(prev.target.y + prev.target.height / 2 - (next.target.y + next.target.height / 2));
    return dx > 0.03 || dy > 0.03;
  }
  return false;
}
