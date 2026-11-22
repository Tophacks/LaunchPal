import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import type { ModelClient } from "../src/model.js";
import { UpstreamError } from "../src/model.js";
import { createServer } from "../src/server.js";
import { validateModelOutput } from "../src/schema.js";

const png = (n: string) => "data:image/png;base64," + readFileSync(new URL(`../fixtures/${n}.png`, import.meta.url)).toString("base64");
const TOKEN = "test-token";
const point = { status: "point", instruction: "Click Connect workspace.", visible_label: "Connect workspace", success_evidence: null, target: { x: 549, y: 267, width: 135, height: 53 } };

let handler: ModelClient["inspect"] = async () => point;
let calls = 0;
const model: ModelClient = { inspect: (a) => { calls++; return handler(a); } };
let seenGuide = "";
const guides = { async get(id?: string) { return id === undefined ? "DEFAULT" : id === "other-guide" ? "OTHER" : undefined; } };
const server = createServer({ config: { inspectToken: TOKEN, openaiTimeoutMs: 300, maxImageBytes: 2 * 1024 * 1024, openaiModel: "m" }, model: { inspect: (a) => { seenGuide = a.guide; return model.inspect(a); } }, guides });
let base = "";
before(() => new Promise<void>((r) => server.listen(0, () => { base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; r(); })));
after(() => { server.close(); });

const post = (body: unknown, headers: Record<string, string> = { authorization: `Bearer ${TOKEN}` }) =>
  fetch(`${base}/inspect`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
const ok = { frameId: "f-1", imageDataUrl: png("start"), question: "Where do I click?" };

describe("validateModelOutput", () => {
  const base = { visible_label: null, success_evidence: null, target: null };
  it("converts grid to fractions and echoes frameId", () => {
    const r = validateModelOutput(point, "abc");
    assert.deepEqual(r, { frameId: "abc", status: "point", instruction: "Click Connect workspace.", target: { x: 0.549, y: 0.267, width: 0.135, height: 0.053 } });
  });
  it("rejects point without target / label / label in instruction", () => {
    assert.throws(() => validateModelOutput({ ...point, target: null }, "f"));
    assert.throws(() => validateModelOutput({ ...point, visible_label: null }, "f"));
    assert.throws(() => validateModelOutput({ ...point, instruction: "Click the blue button." }, "f"));
  });
  it("rejects zero/negative size and boxes outside the image", () => {
    for (const t of [{ x: 10, y: 10, width: 0, height: 5 }, { x: 10, y: 10, width: 5, height: -1 }, { x: 950, y: 10, width: 60, height: 5 }, { x: 10, y: 990, width: 5, height: 20 }, { x: -1, y: 0, width: 5, height: 5 }])
      assert.throws(() => validateModelOutput({ ...point, target: t }, "f"), undefined, JSON.stringify(t));
  });
  it("unclear/done must have null target; done needs evidence", () => {
    assert.throws(() => validateModelOutput({ ...base, status: "unclear", instruction: "Show the window.", target: { x: 1, y: 1, width: 1, height: 1 } }, "f"));
    assert.throws(() => validateModelOutput({ ...base, status: "done", instruction: "All set." }, "f"));
    assert.deepEqual(validateModelOutput({ ...base, status: "done", instruction: "Your workspace is connected.", success_evidence: "Workspace connected heading" }, "f"), { frameId: "f", status: "done", instruction: "Your workspace is connected.", target: null });
    assert.equal(validateModelOutput({ ...base, status: "unclear", instruction: "Show the window." }, "f").target, null);
  });
});

describe("POST /inspect", () => {
  it("GET /health is open", async () => { const r = await fetch(`${base}/health`); assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true }); });
  it("200 with contract shape", async () => {
    handler = async () => point;
    const r = await post(ok); assert.equal(r.status, 200);
    const j = await r.json(); assert.equal(j.frameId, "f-1"); assert.equal(j.status, "point"); assert.deepEqual(Object.keys(j).sort(), ["frameId", "instruction", "status", "target"]);
  });
  it("401 without / with wrong token (model not called)", async () => {
    const before = calls;
    assert.equal((await post(ok, {})).status, 401);
    assert.equal((await post(ok, { authorization: "Bearer nope" })).status, 401);
    assert.equal(calls, before);
  });
  it("400 invalid json / fields / image", async () => {
    assert.equal((await post("{nope")).status, 400);
    assert.equal((await post({ frameId: "x" })).status, 400);
    assert.equal((await post({ ...ok, imageDataUrl: "data:image/gif;base64,R0lGOD" })).status, 400);
    assert.equal((await post({ ...ok, imageDataUrl: "data:image/png;base64," + Buffer.from("not a png at all, just text bytes").toString("base64") })).status, 400);
    assert.equal((await post({ ...ok, imageDataUrl: "data:image/jpeg;base64," + readFileSync(new URL("../fixtures/start.png", import.meta.url)).toString("base64") })).status, 400, "png bytes labelled jpeg");
  });
  it("guideId selects the guide; absent uses default; unknown is 404; malformed is 400", async () => {
    handler = async () => point;
    await post(ok); assert.equal(seenGuide, "DEFAULT");
    await post({ ...ok, guideId: "other-guide" }); assert.equal(seenGuide, "OTHER");
    assert.equal((await post({ ...ok, guideId: "nope" })).status, 404);
    for (const bad of ["../../etc/passwd", "A B", "", "x".repeat(80)]) assert.equal((await post({ ...ok, guideId: bad })).status, 400, bad);
  });
  it("accepts a 1920x1080 full-screen PNG and both helper questions", async () => {
    handler = async () => point;
    const img = "data:image/png;base64," + readFileSync(new URL("../fixtures/screen/start.png", import.meta.url)).toString("base64");
    for (const question of ["Where do I click?", "What is the next step?"]) assert.equal((await post({ frameId: "s", imageDataUrl: img, question })).status, 200);
  });
  it("413 over 2MB decoded", async () => {
    const big = Buffer.concat([readFileSync(new URL("../fixtures/start.png", import.meta.url)), Buffer.alloc(2 * 1024 * 1024)]);
    assert.equal((await post({ ...ok, imageDataUrl: "data:image/png;base64," + big.toString("base64") })).status, 413);
  });
  it("504 on timeout", async () => {
    handler = ({ signal }) => new Promise((_, rej) => signal.addEventListener("abort", () => rej(new Error("aborted"))));
    assert.equal((await post(ok)).status, 504);
  });
  it("502 on upstream failure", async () => { handler = async () => { throw new UpstreamError("boom"); }; assert.equal((await post(ok)).status, 502); });
  it("503 upstream_rate_limited when OpenAI returns 429", async () => {
    handler = async () => { throw new UpstreamError("rl", 429); };
    const r = await post(ok); assert.equal(r.status, 503); assert.equal((await r.json()).error.code, "upstream_rate_limited");
  });
  it("retries once on invalid model output, then 502", async () => {
    calls = 0; handler = async () => ({ ...point, target: { x: 990, y: 0, width: 50, height: 5 } });
    const r = await post(ok); assert.equal(r.status, 502); assert.equal((await r.json()).error.code, "invalid_upstream_response"); assert.equal(calls, 2);
    calls = 0; let n = 0; handler = async () => (n++ === 0 ? { nonsense: true } : point);
    assert.equal((await post(ok)).status, 200); assert.equal(calls, 2);
  });
  it("never echoes the screenshot in errors", async () => {
    handler = async () => ({ bad: 1 }); const t = await (await post(ok)).text(); assert.ok(!t.includes("base64"));
  });
});
