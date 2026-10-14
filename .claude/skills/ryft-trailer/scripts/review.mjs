#!/usr/bin/env node
// A second opinion that watches AND listens: uploads a trailer to Google Gemini, which grades it
// against the trailer rubric (references/trailer-craft.md §9) and answers mix questions that stills
// and loudness numbers can't (does the score clash with the game's music, do hits land, is the
// silence real, can you read the text?). Advisory only: a person should still watch it.
// Needs an API key: https://aistudio.google.com/apikey  →  export GEMINI_API_KEY=...
//
//   node review.mjs trailer.mp4 [--brief TRAILER.md] [--model auto|<model-id>] [--out review.json]
//
// The upload is deleted from Google's servers when the review is done.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://generativelanguage.googleapis.com";

export const RUBRIC = ["opening", "genreClarity", "hook", "escalation", "readability", "text", "sound", "sync", "ending", "honesty"];

export function prompt(brief = "") {
  return `You are a professional video game trailer editor reviewing a trailer for a small 2D browser game.
Watch the whole video WITH its audio. Be specific and honest; cite timestamps (m:ss).

Score each criterion 0-2 (2 = meets the bar, 1 = partly, 0 = fails):
- opening: core gameplay verb in motion within the first 2 seconds (no logo, lore card or menu first)
- genreClarity: a stranger could name the genre by 5 seconds
- hook: the game's unique mechanic is isolated and readable by about a third of the way in
- escalation: each section bigger than the last; variety of areas/enemies
- readability: every shot reads on a phone screen (characters/cards/text big enough)
- text: few words, styled like the game, on screen long enough to read, no lore dumps or feature bullets
- sound: music fits the game's world; game sound effects audible; real silence before the payoff
- sync: cuts and hits land on the music; on-screen impacts have sounds
- ending: title late, a last gameplay moment, end card with a call to action held ~3 s
- honesty: everything shown looks like real gameplay

Then answer about the AUDIO specifically:
- Does the score clash (key, rhythm, density) with any game music audible underneath? Where?
- Are any sounds harsh, too loud, too quiet, or masking each other? Where?
- Do on-screen hits have matching sounds within a frame or two? List any that don't.
- Is there a moment of true silence before the title? Does the payoff hit land?

${brief ? `The creator's plan for this trailer (judge against it):\n---\n${brief.slice(0, 8000)}\n---\n` : ""}
Reply with JSON only, in exactly this shape:
{"scores": {${RUBRIC.map((k) => `"${k}": 0`).join(", ")}},
 "total": 0,
 "strengths": ["..."],
 "fixes": [{"at": "m:ss", "issue": "...", "fix": "..."}],
 "audio": {"clash": "...", "balance": "...", "unsyncedHits": ["m:ss ..."], "silenceAndPayoff": "..."},
 "verdict": "ship | fix first"}`;
}

// Models to try, best first. Google's maintained aliases (gemini-pro-latest, gemini-flash-latest)
// come first: version-sorting raw names picks codename/experimental models that often have no
// quota. Then stable numbered pro/flash models, newest first. review() falls back down this list
// when a model is out of quota.
export function candidateModels(models) {
  const names = models.filter((m) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m) => m.name.replace(/^models\//, ""));
  const aliases = ["gemini-pro-latest", "gemini-flash-latest"].filter((a) => names.includes(a));
  const numbered = names
    .filter((n) => /^gemini-\d+(\.\d+)?-(pro|flash)$/.test(n))
    .map((n) => ({ n, v: Number(n.match(/gemini-(\d+(?:\.\d+)?)/)[1]), pro: n.endsWith("-pro") }))
    .sort((a, b) => b.v - a.v || Number(b.pro) - Number(a.pro))
    .map((x) => x.n);
  const list = [...new Set([...aliases, ...numbered])];
  if (!list.length) throw new Error("No Gemini pro/flash model available for generateContent on this key");
  return list;
}
export const pickModel = (models) => candidateModels(models)[0];

export function parseReview(text) {
  const json = text.match(/\{[\s\S]*\}/);
  if (!json) throw new Error(`Gemini didn't return JSON: ${text.slice(0, 200)}`);
  const r = JSON.parse(json[0]);
  for (const k of RUBRIC) r.scores[k] = Math.max(0, Math.min(2, Number(r.scores?.[k] ?? 0)));
  r.total = RUBRIC.reduce((a, k) => a + r.scores[k], 0); // recompute, don't trust the model's sum
  r.ship = r.total >= 16 && RUBRIC.every((k) => r.scores[k] > 0);
  return r;
}

export async function review(file, { brief = "", model = "auto", key = process.env.GEMINI_API_KEY, fetchImpl = fetch, pollMs = 3000, retryMs = 4000, log = () => {} } = {}) {
  if (!key) throw new Error("Set GEMINI_API_KEY (https://aistudio.google.com/apikey)");
  const headers = { "x-goog-api-key": key };
  const json = async (res, what) => { if (!res.ok) throw new Error(`Gemini ${what} failed: ${res.status} ${(await res.text()).slice(0, 300)}`); return res.json(); };

  let models = [model];
  if (model === "auto") {
    const list = await json(await fetchImpl(`${BASE}/v1beta/models?pageSize=200`, { headers }), "model list");
    models = candidateModels(list.models || []);
  }

  // Resumable upload to the Files API.
  const bytes = fs.readFileSync(file);
  const start = await fetchImpl(`${BASE}/upload/v1beta/files`, {
    method: "POST",
    headers: { ...headers, "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start", "X-Goog-Upload-Header-Content-Length": String(bytes.length), "X-Goog-Upload-Header-Content-Type": "video/mp4", "Content-Type": "application/json" },
    body: JSON.stringify({ file: { display_name: path.basename(file) } }),
  });
  if (!start.ok) throw new Error(`Gemini upload start failed: ${start.status} ${(await start.text()).slice(0, 300)}`);
  const uploadUrl = start.headers.get("x-goog-upload-url");
  const up = await json(await fetchImpl(uploadUrl, { method: "POST", headers: { "X-Goog-Upload-Command": "upload, finalize", "X-Goog-Upload-Offset": "0", "Content-Length": String(bytes.length) }, body: bytes }), "upload");
  let f = up.file;
  log(`uploaded: ${f.name}`);
  try {
    for (let i = 0; f.state === "PROCESSING" && i < 100; i++) {
      await new Promise((r) => setTimeout(r, pollMs));
      f = await json(await fetchImpl(`${BASE}/v1beta/${f.name}`, { headers }), "file status");
    }
    if (f.state !== "ACTIVE") throw new Error(`Uploaded file isn't usable (state ${f.state})`);
    const body = {
      contents: [{ parts: [{ file_data: { mime_type: f.mimeType || "video/mp4", file_uri: f.uri } }, { text: prompt(brief) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    };
    // Try each model. Temporary overloads (500/503) are retried with backoff; out of quota (429),
    // unavailable (404) or still overloaded moves on to the next model.
    const tried = [];
    for (const m of models) {
      log(`model: ${m}`);
      let res;
      for (let attempt = 0; attempt < 4; attempt++) {
        res = await fetchImpl(`${BASE}/v1beta/models/${m}:generateContent`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (res.status !== 500 && res.status !== 503) break;
        if (attempt < 3) { log(`  ${m} busy (${res.status}), retrying in ${retryMs * 2 ** attempt / 1000}s`); await new Promise((r) => setTimeout(r, retryMs * 2 ** attempt)); }
      }
      if ([404, 429, 500, 503].includes(res.status) && m !== models.at(-1)) { tried.push(`${m} (${res.status})`); continue; }
      const out = await json(res, "review");
      const text = (out.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
      return { model: m, skipped: tried, ...parseReview(text) };
    }
  } finally {
    await fetchImpl(`${BASE}/v1beta/${f.name}`, { method: "DELETE", headers }).catch(() => {});
  }
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const briefFile = opt("--brief"), model = opt("--model") || "auto", out = opt("--out");
  if (!args[0]) { console.log("Usage: node review.mjs trailer.mp4 [--brief TRAILER.md] [--model auto|id] [--out review.json]"); process.exit(2); }
  review(args[0], { brief: briefFile ? fs.readFileSync(briefFile, "utf8") : "", model, log: (m) => console.error(m) }).then((r) => {
    if (out) fs.writeFileSync(out, JSON.stringify(r, null, 2) + "\n");
    console.log(`${r.total}/20 (${r.ship ? "meets the ship bar" : "fix first"}) · model ${r.model}`);
    for (const k of RUBRIC) console.log(`  ${k.padEnd(13)} ${r.scores[k]}`);
    for (const f of r.fixes || []) console.log(`  fix @${f.at}: ${f.issue} → ${f.fix}`);
    if (r.audio) for (const [k, v] of Object.entries(r.audio)) console.log(`  audio/${k}: ${Array.isArray(v) ? v.join("; ") : v}`);
  }).catch((e) => { console.error(e.message); process.exit(1); });
}
