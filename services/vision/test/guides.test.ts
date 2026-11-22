import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileGuideStore } from "../src/guides.js";

test("fileGuideStore: default, by id, unknown, and traversal attempts", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "guides-"));
  writeFileSync(path.join(dir, "acme-sync.md"), "ACME");
  writeFileSync(path.join(dir, "other.md"), "OTHER");
  writeFileSync(path.join(dir, "..secret.md"), "NO");
  const s = fileGuideStore(dir);
  assert.equal(await s.get(), "ACME");
  assert.equal(await s.get("other"), "OTHER");
  assert.equal(await s.get("missing"), undefined);
  for (const bad of ["../x", "..secret", "a/b", "A", ""]) assert.equal(await s.get(bad), undefined, bad);
});
