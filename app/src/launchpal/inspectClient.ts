// Calls the Wasp server proxy POST /api/inspect (which forwards to Maritime). Never logs image data.
import type { InspectRequest, InspectResponse } from "./types";

export const GENERIC_ERROR = "Couldn't check your screen — try again.";
const CLIENT_TIMEOUT_MS = 20_000; // proxy itself times out at 15 s

export class LaunchpalError extends Error {
  constructor(message: string, public code = "inspect-failed") {
    super(message);
    this.name = "LaunchpalError";
  }
}

function isTarget(t: unknown): boolean {
  if (!t || typeof t !== "object") return false;
  const o = t as Record<string, unknown>;
  return ["x", "y", "width", "height"].every((k) => typeof o[k] === "number" && Number.isFinite(o[k]));
}

/** Validates a proxy response against the contract; throws LaunchpalError on anything else. */
export function parseInspectResponse(body: unknown, frameId: string): InspectResponse {
  const o = body as Partial<InspectResponse> | null;
  if (!o || typeof o !== "object") throw new LaunchpalError(GENERIC_ERROR);
  if (o.status !== "point" && o.status !== "unclear" && o.status !== "done") throw new LaunchpalError(GENERIC_ERROR);
  if (typeof o.instruction !== "string" || !o.instruction.trim()) throw new LaunchpalError(GENERIC_ERROR);
  if (o.status === "point" && !isTarget(o.target)) throw new LaunchpalError(GENERIC_ERROR);
  return {
    frameId: typeof o.frameId === "string" ? o.frameId : frameId,
    status: o.status,
    instruction: o.instruction.trim(),
    target: o.status === "point" ? (o.target as InspectResponse["target"]) : null,
  };
}

export function makeProxyInspect(baseUrl = "") {
  return async function proxyInspect(req: InspectRequest): Promise<InspectResponse> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl}/api/inspect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new LaunchpalError(GENERIC_ERROR, `http-${res.status}`);
      return parseInspectResponse(await res.json(), req.frameId);
    } catch (e) {
      if (e instanceof LaunchpalError) throw e;
      throw new LaunchpalError(GENERIC_ERROR, "network");
    } finally {
      clearTimeout(timer);
    }
  };
}
