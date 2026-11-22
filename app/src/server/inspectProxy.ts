// Wasp server proxy: POST /api/inspect → `${MARITIME_INSPECT_URL}/inspect` with the shared bearer token.
// Never logs image data; logs only frameId, status and latency.
import express from "express";
import type { MiddlewareConfigFn } from "wasp/server";
import type { InspectHealth, InspectProxy } from "wasp/server/api";
import { getStoredGuide } from "./guides";

const MAX_DECODED_BYTES = 2 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 15_000;
const HEALTH_TIMEOUT_MS = 5_000;
const GENERIC = "Couldn't check your screen — try again.";
const GUIDE_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const DATA_URL_RE =/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/;

export const inspectNamespaceMiddleware: MiddlewareConfigFn = (middlewareConfig) => {
  // ~2 MB decoded is ~2.7 MB as base64 JSON; allow headroom, reject precisely below.
  middlewareConfig.set("express.json", express.json({ limit: "4mb" }));
  return middlewareConfig;
};

function fail(res: Parameters<InspectProxy>[1], status: number, code: string) {
  res.status(status).json({ error: { code, message: GENERIC } });
}

function maritimeConfig() {
  const base = (process.env.MARITIME_INSPECT_URL || "").trim().replace(/\/+$/, "");
  const token = (process.env.MARITIME_TOKEN || "").trim();
  return base && token ? { base, token } : null;
}

/**
 * A founder-published guide is sent as `guideText` (its slug is not a file guide on the vision service, so guideId
 * is omitted). Otherwise guideId is forwarded and the vision service uses its own file guides (e.g. acme-sync).
 */
function upstreamBody(frameId: string, imageDataUrl: string, question: string, guideId?: string) {
  const published = getStoredGuide(guideId);
  if (published) return { frameId, imageDataUrl, question, guideText: published.content };
  return guideId ? { frameId, imageDataUrl, question, guideId } : { frameId, imageDataUrl, question };
}

function decodedSize(b64: string) {
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

export const inspectProxy: InspectProxy = async (req, res) => {
  const started = Date.now();
  const body = (req.body ?? {}) as Record<string, unknown>;
  const { frameId, imageDataUrl, question, guideId } = body;
  if (guideId !== undefined && (typeof guideId !== "string" || !GUIDE_ID_RE.test(guideId))) {
    return fail(res, 400, "invalid_request");
  }

  if (typeof frameId !== "string" || !frameId || frameId.length > 200) return fail(res, 400, "invalid_request");
  if (typeof question !== "string" || !question.trim() || question.length > 1000) return fail(res, 400, "invalid_request");
  if (typeof imageDataUrl !== "string") return fail(res, 400, "invalid_request");
  const m = DATA_URL_RE.exec(imageDataUrl);
  if (!m) return fail(res, 400, "invalid_image");
  if (decodedSize(m[2]) > MAX_DECODED_BYTES) return fail(res, 413, "image_too_large");

  const cfg = maritimeConfig();
  if (!cfg) {
    console.error("[inspect] MARITIME_INSPECT_URL / MARITIME_TOKEN not set");
    return fail(res, 503, "not_configured");
  }

  try {
    const upstream = await fetch(`${cfg.base}/inspect`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.token}` },
      body: JSON.stringify(upstreamBody(frameId, imageDataUrl, question, guideId as string | undefined)),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const ms = Date.now() - started;
    if (!upstream.ok) {
      console.warn(`[inspect] frameId=${frameId} upstream=${upstream.status} ms=${ms}`);
      if (upstream.status === 404 && guideId) return fail(res, 404, "guide_not_found");
      return fail(res, upstream.status === 504 ? 504 : 502, "upstream_error");
    }
    const data = (await upstream.json()) as { status?: string; frameId?: string };
    if (!data || !["point", "unclear", "done"].includes(String(data.status))) {
      console.warn(`[inspect] frameId=${frameId} invalid upstream body ms=${ms}`);
      return fail(res, 502, "invalid_upstream_response");
    }
    console.log(`[inspect] frameId=${frameId} status=${data.status} ms=${ms}`);
    res.json({ ...data, frameId: data.frameId ?? frameId });
  } catch (e) {
    const ms = Date.now() - started;
    const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    console.warn(`[inspect] frameId=${frameId} ${timeout ? "timeout" : "network error"} ms=${ms}`);
    fail(res, timeout ? 504 : 502, timeout ? "upstream_timeout" : "upstream_error");
  }
};

export const inspectHealth: InspectHealth = async (_req, res) => {
  const cfg = maritimeConfig();
  if (!cfg) return res.status(503).json({ ok: false, configured: false });
  try {
    const upstream = await fetch(`${cfg.base}/health`, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
    const text = await upstream.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* plain-text health */
    }
    res.status(upstream.ok ? 200 : 502).json({ ok: upstream.ok, configured: true, upstream: body });
  } catch {
    res.status(502).json({ ok: false, configured: true });
  }
};
