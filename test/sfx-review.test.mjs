// Run with: node --test test/sfx-review.test.mjs   (no network: the APIs are mocked)
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { searchUrl, licenseTag, search, get } from "../.claude/skills/ryft-trailer/scripts/sfx.mjs";
import { pickModel, candidateModels, parseReview, review, prompt } from "../.claude/skills/ryft-trailer/scripts/review.mjs";

const json = (body, init = {}) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", ...(init.headers || {}) } });

test("Freesound: one combined filter, safe licences only", () => {
  const u = new URL(searchUrl("sword impact", { max: 3 }));
  assert.strictEqual(u.searchParams.getAll("filter").length, 1);
  assert.match(u.searchParams.get("filter"), /duration:\[0 TO 3\] license:\("Creative Commons 0" OR "Attribution"\)/);
  assert.strictEqual(licenseTag("http://creativecommons.org/publicdomain/zero/1.0/"), "CC0");
  assert.strictEqual(licenseTag("https://creativecommons.org/licenses/by/4.0/"), "CC BY");
  assert.strictEqual(licenseTag("https://creativecommons.org/licenses/by-nc/4.0/"), "CC BY-NC");
});

test("Freesound: search drops non-commercial results even if the API returns them", async () => {
  const fetchImpl = async () => json({ results: [
    { id: 1, name: "hit.wav", username: "a", duration: 0.8, license: "http://creativecommons.org/publicdomain/zero/1.0/", url: "https://freesound.org/s/1/" },
    { id: 2, name: "nc.wav", username: "b", duration: 1, license: "https://creativecommons.org/licenses/by-nc/4.0/", url: "https://freesound.org/s/2/" },
  ] });
  const r = await search("hit", {}, { fetchImpl, key: "k" });
  assert.deepStrictEqual(r.map((x) => x.id), [1]);
});

test("Freesound: get saves audio and a credits ledger, and refuses NC sounds", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ryft-sfx-"));
  const sounds = {
    7: { id: 7, name: "Big Boom.wav", username: "mia", license: "https://creativecommons.org/licenses/by/4.0/", url: "https://freesound.org/s/7/", previews: { "preview-hq-mp3": "https://cdn/7.mp3" } },
    8: { id: 8, name: "nc.wav", username: "x", license: "https://creativecommons.org/licenses/by-nc/3.0/", url: "https://freesound.org/s/8/", previews: { "preview-hq-mp3": "https://cdn/8.mp3" } },
  };
  const fetchImpl = async (url) => url.startsWith("https://cdn/") ? new Response(new Uint8Array([1, 2, 3])) : json(sounds[url.match(/sounds\/(\d+)/)[1]]);
  const saved = await get([7], dir, { fetchImpl, key: "k" });
  assert.strictEqual(saved[0].file, "7-big-boom.mp3");
  assert.ok(fs.existsSync(path.join(dir, "7-big-boom.mp3")));
  const credits = fs.readFileSync(path.join(dir, "CREDITS.md"), "utf8");
  assert.match(credits, /"Big Boom.wav" by mia .* CC BY/);
  assert.match(credits, /1 sound\(s\) need attribution/);
  await assert.rejects(get([8], dir, { fetchImpl, key: "k" }), /CC BY-NC/);
  fs.rmSync(dir, { recursive: true });
});

test("Gemini: picks maintained aliases, then stable models; never codenames", () => {
  const models = [
    { name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-3.0-pro", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-3.0-flash", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-3.5-pro-preview", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-embedding-2", supportedGenerationMethods: ["embedContent"] },
    { name: "models/gemini-3.5-flash-tts", supportedGenerationMethods: ["generateContent"] },
  ];
  // Codename and preview models are skipped; the stable numbered ones are ordered newest first.
  assert.strictEqual(pickModel([...models, { name: "models/gemini-4-argon", supportedGenerationMethods: ["generateContent"] }]), "gemini-3.0-pro");
  // Google's maintained aliases win when present.
  assert.deepStrictEqual(candidateModels([...models, { name: "models/gemini-flash-latest", supportedGenerationMethods: ["generateContent"] }, { name: "models/gemini-pro-latest", supportedGenerationMethods: ["generateContent"] }]).slice(0, 3), ["gemini-pro-latest", "gemini-flash-latest", "gemini-3.0-pro"]);
});

test("Gemini: the grade is recomputed and clamped, not trusted", () => {
  const r = parseReview('```json\n{"scores":{"opening":2,"genreClarity":2,"hook":2,"escalation":2,"readability":1,"text":2,"sound":5,"sync":2,"ending":2,"honesty":2},"total":99}\n```');
  assert.strictEqual(r.scores.sound, 2);
  assert.strictEqual(r.total, 19);
  assert.strictEqual(r.ship, true);
  assert.strictEqual(parseReview('{"scores":{"opening":0}}').ship, false);
  assert.match(prompt("my plan"), /my plan/);
});

test("Gemini: upload, wait, review, then delete the upload", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ryft-review-"));
  const video = path.join(dir, "t.mp4"); fs.writeFileSync(video, Buffer.alloc(1000));
  const calls = [];
  let polls = 0;
  const fetchImpl = async (url, init = {}) => {
    calls.push(`${init.method || "GET"} ${url.replace("https://generativelanguage.googleapis.com", "")}`);
    assert.strictEqual(init.headers?.["x-goog-api-key"] ?? "k", "k");
    if (url.includes("/models?")) return json({ models: [{ name: "models/gemini-3.0-pro", supportedGenerationMethods: ["generateContent"] }] });
    if (url.endsWith("/upload/v1beta/files")) return json({}, { headers: { "x-goog-upload-url": "https://upload.example/u1" } });
    if (url === "https://upload.example/u1") return json({ file: { name: "files/abc", uri: "https://g/files/abc", state: "PROCESSING", mimeType: "video/mp4" } });
    if (url.endsWith("/v1beta/files/abc") && init.method === "DELETE") return json({});
    if (url.endsWith("/v1beta/files/abc")) return json({ name: "files/abc", uri: "https://g/files/abc", state: ++polls > 1 ? "ACTIVE" : "PROCESSING", mimeType: "video/mp4" });
    if (url.includes(":generateContent")) {
      const body = JSON.parse(init.body);
      assert.strictEqual(body.contents[0].parts[0].file_data.file_uri, "https://g/files/abc");
      return json({ candidates: [{ content: { parts: [{ text: '{"scores":{"opening":2,"genreClarity":2,"hook":2,"escalation":2,"readability":1,"text":2,"sound":1,"sync":2,"ending":2,"honesty":2},"fixes":[{"at":"0:12","issue":"x","fix":"y"}]}' }] } }] });
    }
    throw new Error(`unexpected ${url}`);
  };
  const r = await review(video, { key: "k", fetchImpl, pollMs: 1 });
  assert.strictEqual(r.model, "gemini-3.0-pro");
  assert.strictEqual(r.total, 18);
  assert.strictEqual(calls.at(-1), "DELETE /v1beta/files/abc");
  fs.rmSync(dir, { recursive: true });
});

test("the sfx command line keeps options out of the query", () => {
  // No key: it must fail on the key, after parsing, not search for "x --max 2".
  let err = "";
  try { execFileSync("node", [".claude/skills/ryft-trailer/scripts/sfx.mjs", "search", "x", "--max", "2", "--n", "3"], { env: { ...process.env, FREESOUND_API_KEY: "" }, stdio: "pipe" }); }
  catch (e) { err = e.stderr.toString(); }
  assert.match(err, /FREESOUND_API_KEY/);
  const src = fs.readFileSync(".claude/skills/ryft-trailer/scripts/sfx.mjs", "utf8");
  assert.ok(src.indexOf('opt("--max")') < src.indexOf("const [cmd, ...rest] = args"), "options must be parsed before the query is read");
});

test("Gemini: falls back to the next model when one is out of quota", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ryft-review-"));
  const video = path.join(dir, "t.mp4"); fs.writeFileSync(video, Buffer.alloc(10));
  const fetchImpl = async (url, init = {}) => {
    if (url.includes("/models?")) return json({ models: ["gemini-pro-latest", "gemini-flash-latest"].map((n) => ({ name: "models/" + n, supportedGenerationMethods: ["generateContent"] })) });
    if (url.endsWith("/upload/v1beta/files")) return json({}, { headers: { "x-goog-upload-url": "https://upload.example/u" } });
    if (url === "https://upload.example/u") return json({ file: { name: "files/z", uri: "u", state: "ACTIVE" } });
    if (url.includes("gemini-pro-latest:generateContent")) return new Response("quota", { status: 429 });
    if (url.includes("gemini-flash-latest:generateContent")) return json({ candidates: [{ content: { parts: [{ text: '{"scores":{"opening":2}}' }] } }] });
    return json({});
  };
  const r = await review(video, { key: "k", fetchImpl, pollMs: 1 });
  assert.strictEqual(r.model, "gemini-flash-latest");
  assert.deepStrictEqual(r.skipped, ["gemini-pro-latest (429)"]);
  fs.rmSync(dir, { recursive: true });
});

test("Gemini: retries a busy model (503), then falls back if it stays busy", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ryft-review-"));
  const video = path.join(dir, "t.mp4"); fs.writeFileSync(video, Buffer.alloc(10));
  let flashCalls = 0, liteCalls = 0;
  const fetchImpl = async (url) => {
    if (url.includes("/models?")) return json({ models: ["gemini-flash-latest", "gemini-3.0-flash"].map((n) => ({ name: "models/" + n, supportedGenerationMethods: ["generateContent"] })) });
    if (url.endsWith("/upload/v1beta/files")) return json({}, { headers: { "x-goog-upload-url": "https://upload.example/u" } });
    if (url === "https://upload.example/u") return json({ file: { name: "files/z", uri: "u", state: "ACTIVE" } });
    if (url.includes("gemini-flash-latest:generateContent")) { flashCalls++; return new Response("busy", { status: 503 }); }
    if (url.includes("gemini-3.0-flash:generateContent")) { liteCalls++; return liteCalls < 2 ? new Response("busy", { status: 503 }) : json({ candidates: [{ content: { parts: [{ text: '{"scores":{"opening":2}}' }] } }] }); }
    return json({});
  };
  const r = await review(video, { key: "k", fetchImpl, pollMs: 1, retryMs: 1 });
  assert.strictEqual(flashCalls, 4, "the busy model is tried 4 times");
  assert.strictEqual(r.model, "gemini-3.0-flash", "then the next model is used, after its own retry");
  assert.deepStrictEqual(r.skipped, ["gemini-flash-latest (503)"]);
  fs.rmSync(dir, { recursive: true });
});
