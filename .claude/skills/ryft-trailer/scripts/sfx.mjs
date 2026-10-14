#!/usr/bin/env node
// Real sound effects from Freesound (freesound.org), with the licence of every sound recorded.
// Needs a free API key: https://freesound.org/apiv2/apply  →  export FREESOUND_API_KEY=...
//
//   node sfx.mjs search "sword impact" [--max 3] [--license safe|cc0|any] [--n 10]
//   node sfx.mjs get <id> [<id>...] --out trailer-kit/audio/sfx
//
// --license safe (default): CC0 and CC BY only. Non-commercial (NC) and Sampling+ sounds are left
// out: a trailer promotes something, so don't rely on "non-commercial".
// `get` downloads Freesound's high-quality preview (MP3, no login needed) and appends each sound's
// author, licence and link to CREDITS.md / credits.json in the same folder. CC BY sounds need that
// credit wherever the trailer is published (the post's reply, the Ryft listing, or a credits card).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://freesound.org/apiv2";

// Licence URL → short tag. Freesound returns licences as Creative Commons URLs.
export function licenseTag(url = "") {
  const u = url.toLowerCase();
  if (u.includes("publicdomain/zero") || u.includes("cc0")) return "CC0";
  if (u.includes("sampling")) return "Sampling+";
  if (u.includes("by-nc")) return "CC BY-NC";
  if (u.includes("/by/")) return "CC BY";
  return "unknown";
}
export const SAFE = new Set(["CC0", "CC BY"]);

// One `filter` parameter with space-separated conditions (repeating `filter=` keeps only one).
export function searchUrl(query, { max, license = "safe", n = 10 } = {}) {
  const conds = [];
  if (max) conds.push(`duration:[0 TO ${Number(max)}]`);
  if (license === "cc0") conds.push('license:"Creative Commons 0"');
  else if (license === "safe") conds.push('license:("Creative Commons 0" OR "Attribution")');
  const p = new URLSearchParams({ query, fields: "id,name,username,duration,license,url,previews", page_size: String(n), sort: "score" });
  if (conds.length) p.set("filter", conds.join(" "));
  return `${API}/search/text/?${p}`;
}

async function api(url, fetchImpl, key) {
  const res = await fetchImpl(url, { headers: { Authorization: `Token ${key}` } });
  if (!res.ok) throw new Error(`Freesound ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export async function search(query, opts = {}, { fetchImpl = fetch, key = process.env.FREESOUND_API_KEY } = {}) {
  if (!key) throw new Error("Set FREESOUND_API_KEY (free key: https://freesound.org/apiv2/apply)");
  const data = await api(searchUrl(query, opts), fetchImpl, key);
  // Double-check licences client-side: never return NC/Sampling+ under "safe".
  return data.results
    .map((r) => ({ id: r.id, name: r.name, by: r.username, seconds: +Number(r.duration).toFixed(2), license: licenseTag(r.license), licenseUrl: r.license, url: r.url }))
    .filter((r) => opts.license === "any" || (opts.license === "cc0" ? r.license === "CC0" : SAFE.has(r.license)));
}

export function credit(s) {
  return s.license === "CC0"
    ? `"${s.name}" by ${s.by} (${s.url}), CC0 (no attribution required)`
    : `"${s.name}" by ${s.by} (${s.url}), licensed ${s.license} (${s.licenseUrl})`;
}

export async function get(ids, out, { fetchImpl = fetch, key = process.env.FREESOUND_API_KEY, allowUnsafe = false } = {}) {
  if (!key) throw new Error("Set FREESOUND_API_KEY (free key: https://freesound.org/apiv2/apply)");
  fs.mkdirSync(out, { recursive: true });
  const ledgerFile = path.join(out, "credits.json");
  const ledger = fs.existsSync(ledgerFile) ? JSON.parse(fs.readFileSync(ledgerFile, "utf8")) : [];
  const saved = [];
  for (const id of ids) {
    const s = await api(`${API}/sounds/${id}/?fields=id,name,username,license,url,previews`, fetchImpl, key);
    const entry = { id: s.id, name: s.name, by: s.username, license: licenseTag(s.license), licenseUrl: s.license, url: s.url };
    if (!allowUnsafe && !SAFE.has(entry.license)) throw new Error(`Sound ${id} is ${entry.license}; only CC0 and CC BY are allowed in trailers (use --allow-unsafe to override)`);
    const res = await fetchImpl(s.previews["preview-hq-mp3"]);
    if (!res.ok) throw new Error(`Download of ${id} failed: ${res.status}`);
    const slug = s.name.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "sound";
    entry.file = `${s.id}-${slug}.mp3`;
    fs.writeFileSync(path.join(out, entry.file), Buffer.from(await res.arrayBuffer()));
    if (!ledger.some((e) => e.id === entry.id)) ledger.push(entry);
    saved.push(entry);
  }
  fs.writeFileSync(ledgerFile, JSON.stringify(ledger, null, 2) + "\n");
  const needsCredit = ledger.filter((e) => e.license !== "CC0");
  fs.writeFileSync(path.join(out, "CREDITS.md"), `# Sound credits\n\nSounds from Freesound (freesound.org).\n\n${ledger.map((e) => `- ${credit(e)}`).join("\n")}\n` +
    (needsCredit.length ? `\n**${needsCredit.length} sound(s) need attribution** wherever the trailer is published (e.g. the post's reply, the Ryft listing, or an end credit).\n` : "\nAll sounds are CC0: no attribution required.\n"));
  return saved;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const flag = (n) => { const i = args.indexOf(n); if (i >= 0) args.splice(i, 1); return i >= 0; };
  // Take the options out first; what's left is the command and the query / sound ids.
  const max = opt("--max"), license = opt("--license") || "safe", n = Number(opt("--n") || 10);
  const out = opt("--out") || "sfx", allowUnsafe = flag("--allow-unsafe");
  const [cmd, ...rest] = args;
  const run = async () => {
    if (cmd === "search") {
      const results = await search(rest.join(" "), { max, license, n });
      for (const r of results) console.log(`${String(r.id).padEnd(8)} ${r.seconds.toFixed(2).padStart(6)}s  ${r.license.padEnd(6)} ${r.name} (by ${r.by})`);
      if (!results.length) console.log("No results. Try other words, a longer --max, or --license any to see everything.");
    } else if (cmd === "get") {
      const saved = await get(rest, out, { allowUnsafe });
      for (const s of saved) console.log(`${path.join(out, s.file)}  (${s.license})`);
      console.log(`Credits: ${path.join(out, "CREDITS.md")}`);
    } else {
      console.log('Usage: node sfx.mjs search "query" [--max 3] [--license safe|cc0|any] | get <id>... --out dir');
      process.exit(2);
    }
  };
  run().catch((e) => { console.error(e.message); process.exit(1); });
}
