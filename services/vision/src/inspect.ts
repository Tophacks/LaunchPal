import { HttpError } from "./errors.js";
import type { GuideStore } from "./guides.js";
import { parseImageDataUrl } from "./image.js";
import type { ModelClient } from "./model.js";
import { UpstreamError } from "./model.js";
import { InspectRequest, ModelOutputError, validateModelOutput, type InspectResponse } from "./schema.js";

export interface InspectDeps {
  model: ModelClient;
  guides: GuideStore;
  timeoutMs: number;
  maxImageBytes: number;
}

const MAX_ATTEMPTS = 2; // one retry if the model returns output that fails server validation

export async function inspect(body: unknown, deps: InspectDeps): Promise<InspectResponse> {
  const req = InspectRequest.safeParse(body);
  if (!req.success) throw new HttpError(400, "invalid_request", "Body must include frameId, imageDataUrl and question strings.");
  const { frameId, imageDataUrl, question, guideId } = req.data;
  parseImageDataUrl(imageDataUrl, deps.maxImageBytes);
  const guide = await deps.guides.get(guideId);
  if (guide === undefined) throw new HttpError(guideId ? 404 : 500, guideId ? "guide_not_found" : "internal_error", guideId ? `Unknown guideId "${guideId}".` : "Default guide unavailable.");

  const signal = AbortSignal.timeout(deps.timeoutMs); // one deadline across all attempts
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let raw: unknown;
    try {
      raw = await deps.model.inspect({ imageDataUrl, question, guide, signal });
    } catch (e) {
      if (signal.aborted) throw new HttpError(504, "upstream_timeout", "Inspection timed out. Please try again.");
      if (e instanceof UpstreamError && e.upstreamStatus === 429) throw new HttpError(503, "upstream_rate_limited", "Vision model is rate limited. Please try again shortly.");
      if (e instanceof UpstreamError) throw new HttpError(502, "upstream_error", e.message);
      throw new HttpError(502, "upstream_error", "Inspection service failed.");
    }
    try {
      return validateModelOutput(raw, frameId);
    } catch (e) {
      if (!(e instanceof ModelOutputError)) throw e;
      if (attempt === MAX_ATTEMPTS) throw new HttpError(502, "invalid_upstream_response", "Vision model returned an invalid result. Please try again.");
    }
  }
  throw new HttpError(502, "invalid_upstream_response", "Vision model returned an invalid result.");
}
