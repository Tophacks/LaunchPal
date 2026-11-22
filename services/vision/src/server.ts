import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import http from "node:http";
import { MAX_IMAGE_BYTES, type Config } from "./config.js";
import { HttpError } from "./errors.js";
import type { GuideStore } from "./guides.js";
import { inspect } from "./inspect.js";
import type { ModelClient } from "./model.js";

// base64 inflates by 4/3; leave room for JSON envelope + question.
const MAX_BODY_BYTES = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 64 * 1024;

const sha = (s: string) => createHash("sha256").update(s).digest();

function send(res: http.ServerResponse, status: number, body: unknown) {
  const json = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(json);
}

function authorized(req: http.IncomingMessage, token: string): boolean {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? "");
  return !!m && timingSafeEqual(sha(m[1]!), sha(token));
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, "image_too_large", "Request body too large.");
    chunks.push(c as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "invalid_json", "Body must be valid JSON.");
  }
}

export function createServer(opts: { config: Pick<Config, "inspectToken" | "openaiTimeoutMs" | "maxImageBytes" | "openaiModel">; model: ModelClient; guides: GuideStore }) {
  const { config, model, guides } = opts;
  return http.createServer(async (req, res) => {
    const started = Date.now();
    const requestId = randomUUID();
    let frameId: string | undefined;
    let status = 200;
    try {
      const url = new URL(req.url ?? "/", "http://x");
      if (req.method === "GET" && url.pathname === "/health") return send(res, 200, { ok: true });
      if (url.pathname !== "/inspect") throw new HttpError(404, "not_found", "Not found.");
      if (req.method !== "POST") throw new HttpError(405, "method_not_allowed", "Use POST.");
      if (!authorized(req, config.inspectToken)) throw new HttpError(401, "unauthorized", "Missing or invalid bearer token.");
      if (!/^application\/json/i.test(req.headers["content-type"] ?? "")) throw new HttpError(415, "unsupported_media_type", "Use application/json.");
      const body = await readBody(req);
      frameId = typeof (body as { frameId?: unknown })?.frameId === "string" ? (body as { frameId: string }).frameId : undefined;
      const out = await inspect(body, { model, guides, timeoutMs: config.openaiTimeoutMs, maxImageBytes: config.maxImageBytes });
      send(res, 200, out);
    } catch (e) {
      const err = e instanceof HttpError ? e : new HttpError(500, "internal_error", "Internal error.");
      status = err.status;
      send(res, err.status, { error: { code: err.code, message: err.message } });
    } finally {
      // Metadata only: never log screenshots, questions, or tokens.
      console.log(JSON.stringify({ requestId, method: req.method, path: req.url, frameId, status, ms: Date.now() - started }));
    }
  });
}
