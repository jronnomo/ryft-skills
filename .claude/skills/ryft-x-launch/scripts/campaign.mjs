#!/usr/bin/env node
// A local, dependency-free campaign log for launching a Ryft game on X.
// Everything lives in campaign.json next to you; nothing is posted automatically.
//
//   node campaign.mjs init <ryft-game-url>                 check the X card, start campaign.json
//   node campaign.mjs add --type playable --text "..." [--asset f.mp4] [--trailer v2] [--plan 2026-10-20T17:00] [--reply-to p1]
//   node campaign.mjs list                                 drafts and posts, with one-click compose links
//   node campaign.mjs posted <id> <x-post-url> [--at ISO]  mark a draft as posted
//   node campaign.mjs log <id> impressions=1200 likes=40 replies=6 reposts=5 bookmarks=9 linkClicks=31 profileVisits=12 videoViews=800
//   node campaign.mjs report [--out campaign.html]         compare post types, formats and trailers
//
// Options: --file path/to/campaign.json (default ./campaign.json)
//
// Post types: playable (the game link: plays inside X), trailer, loop, challenge, devlog, reply.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TYPES = ["playable", "trailer", "loop", "challenge", "devlog", "reply"];
export const METRICS = ["impressions", "engagements", "likes", "reposts", "replies", "bookmarks", "linkClicks", "profileVisits", "videoViews"];

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// --- the X card -------------------------------------------------------------
export function parseCard(html, headers = {}) {
  const meta = {};
  // Attribute values may contain the other quote character (e.g. "the cathedral's root").
  const unescape = (v) => v.replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  for (const tag of html.match(/<meta\s[^>]*>/gi) || []) {
    const attr = (n) => (tag.match(new RegExp(`\\s${n}=(["'])([\\s\\S]*?)\\1`, "i")) || [])[2];
    const key = attr("name") || attr("property"), content = attr("content");
    if (key && content !== undefined) meta[key.toLowerCase()] ??= unescape(content);
  }
  return {
    title: meta["og:title"] || meta["twitter:title"] || "",
    description: meta["og:description"] || meta["twitter:description"] || "",
    image: meta["twitter:image"] || meta["og:image"] || "",
    card: meta["twitter:card"] || "",
    player: meta["twitter:player"] || "",
    width: Number(meta["twitter:player:width"] || 0),
    height: Number(meta["twitter:player:height"] || 0),
  };
}

export function cardProblems(card, embedCsp = "") {
  const problems = [];
  if (card.card !== "player") problems.push(`twitter:card is "${card.card || "missing"}", not "player": the game won't be playable inside X`);
  if (!card.player) problems.push("no twitter:player URL");
  else if (!card.player.startsWith("https://")) problems.push("twitter:player must be https");
  if (!card.image) problems.push("no card image: the post shows a blank box until someone taps");
  if (card.player && !/frame-ancestors[^;]*(x\.com|twitter\.com)/.test(embedCsp)) problems.push("the embed's Content-Security-Policy doesn't list x.com in frame-ancestors (X may refuse to show it)");
  return problems;
}

async function fetchCard(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Twitterbot/1.0" }, redirect: "follow" });
  const card = parseCard(await res.text());
  let csp = "";
  if (card.player) {
    const e = await fetch(card.player, { headers: { "User-Agent": "Twitterbot/1.0" }, redirect: "follow" }).catch(() => null);
    csp = e?.headers.get("content-security-policy") || "";
  }
  return { card, csp, problems: cardProblems(card, csp) };
}

// --- the campaign file ---------------------------------------------------------
const load = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const save = (file, c) => fs.writeFileSync(file, JSON.stringify(c, null, 2) + "\n");

// X's web intent: opens a prefilled post. Media must still be attached by hand.
export function composeUrl(post, game) {
  const params = new URLSearchParams({ text: post.text });
  if (post.type === "playable" || post.type === "challenge") params.set("url", post.link || game.url);
  return `https://x.com/intent/post?${params}`;
}

export function summarize(c) {
  const rows = c.posts.map((p) => {
    const m = p.metrics.at(-1) || {};
    const eng = m.engagements ?? ["likes", "reposts", "replies", "bookmarks", "linkClicks", "profileVisits"].reduce((a, k) => a + (m[k] || 0), 0);
    const imp = m.impressions || 0;
    return { ...p, last: m, eng, imp, rate: imp ? eng / imp : null, clickRate: imp && m.linkClicks != null ? m.linkClicks / imp : null };
  });
  const group = (key) => {
    const out = {};
    for (const r of rows.filter((r) => r.status === "posted" && r.imp)) {
      const k = r[key] || "(none)";
      out[k] ??= { posts: 0, impressions: 0, engagements: 0, linkClicks: 0 };
      out[k].posts++; out[k].impressions += r.imp; out[k].engagements += r.eng; out[k].linkClicks += r.last.linkClicks || 0;
    }
    for (const g of Object.values(out)) { g.engagementRate = g.engagements / g.impressions; g.clickRate = g.linkClicks / g.impressions; }
    return out;
  };
  return { rows, byType: group("type"), byTrailer: group("trailer") };
}

function reportHtml(c) {
  const { rows, byType, byTrailer } = summarize(c);
  const pct = (x) => (x == null ? "–" : (x * 100).toFixed(1) + "%");
  const table = (groups, label) => {
    const entries = Object.entries(groups).sort((a, b) => b[1].engagementRate - a[1].engagementRate);
    if (!entries.length) return `<p class="muted">No posted ${label} data yet. Log metrics with <code>campaign.mjs log</code>.</p>`;
    const max = Math.max(...entries.map(([, g]) => g.engagementRate));
    return `<table><tr><th>${label}</th><th>Posts</th><th>Impressions</th><th>Engagement rate</th><th></th><th>Link click rate</th></tr>${entries.map(([k, g]) =>
      `<tr><td>${esc(k)}</td><td>${g.posts}</td><td>${g.impressions.toLocaleString()}</td><td>${pct(g.engagementRate)}</td><td><div class="bar" style="width:${Math.round((g.engagementRate / max) * 160)}px"></div></td><td>${pct(g.clickRate)}</td></tr>`).join("")}</table>`;
  };
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.game.title)} campaign</title>
<style>
:root{--bg:#fff;--fg:#1b1b1f;--muted:#6b6b76;--line:#e5e5ea;--bar:#c9852b}
@media (prefers-color-scheme:dark){:root{--bg:#121214;--fg:#ececf1;--muted:#9a9aa6;--line:#2c2c33;--bar:#e0a54a}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;max-width:980px;margin:auto}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px}.muted{color:var(--muted)}
table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
.bar{height:10px;background:var(--bar);border-radius:3px}a{color:inherit}.wrap{overflow-x:auto}
</style>
<h1>${esc(c.game.title)}</h1><p class="muted"><a href="${esc(c.game.url)}">${esc(c.game.url)}</a> · X card: ${c.card.problems.length ? "⚠ " + esc(c.card.problems.join("; ")) : "playable player card ✓"}</p>
<h2>By post type</h2><div class="wrap">${table(byType, "Type")}</div>
<h2>By trailer version</h2><div class="wrap">${table(byTrailer, "Trailer")}</div>
<h2>All posts</h2><div class="wrap"><table><tr><th>ID</th><th>Status</th><th>Type</th><th>Text</th><th>Impressions</th><th>Engagement</th><th>Link clicks</th></tr>${rows.map((r) =>
    `<tr><td>${esc(r.id)}</td><td>${r.status === "posted" ? `<a href="${esc(r.xUrl)}">posted</a>` : `<a href="${esc(composeUrl(r, c.game))}">draft: compose</a>`}</td><td>${esc(r.type)}${r.trailer ? " · " + esc(r.trailer) : ""}</td><td>${esc(r.text)}</td><td>${r.imp || "–"}</td><td>${pct(r.rate)}</td><td>${r.last.linkClicks ?? "–"}</td></tr>`).join("")}</table></div>
<p class="muted">Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} from campaign.json.</p>`;
}

// --- CLI ---------------------------------------------------------------------------
export async function run(argv, { log = console.log } = {}) {
  const args = [...argv];
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const file = path.resolve(opt("--file") || "campaign.json");
  const [cmd, ...rest] = args;

  if (cmd === "init") {
    const url = rest[0];
    if (!url) throw new Error("Usage: campaign.mjs init <ryft-game-url>");
    if (fs.existsSync(file)) throw new Error(`${file} already exists`);
    const { card, csp, problems } = await fetchCard(url);
    save(file, { game: { title: card.title.replace(/\s+[—-]\s+play free on Ryft$/i, ""), url, description: card.description, image: card.image }, card: { ...card, csp, problems, checkedAt: new Date().toISOString() }, posts: [] });
    log(problems.length ? `X card problems:\n- ${problems.join("\n- ")}` : `X card OK: playable ${card.width}x${card.height} player (${card.player})`);
    log(`Wrote ${file}`);
    return;
  }
  const c = load(file);
  if (cmd === "add") {
    const type = opt("--type"), text = opt("--text");
    if (!TYPES.includes(type)) throw new Error(`--type must be one of: ${TYPES.join(", ")}`);
    if (!text) throw new Error("--text is required");
    const post = { id: `p${c.posts.length + 1}`, status: "draft", type, text, asset: opt("--asset") || null, trailer: opt("--trailer") || null, plannedFor: opt("--plan") || null, replyTo: opt("--reply-to") || null, link: opt("--link") || null, metrics: [] };
    if (post.asset && (type === "playable" || type === "challenge")) log("Note: X usually shows attached media instead of the link card, so a playable post with media may not be playable. Post media in a separate post and the game link in a reply.");
    c.posts.push(post); save(file, c);
    log(`${post.id} drafted. Compose: ${composeUrl(post, c.game)}`);
  } else if (cmd === "list") {
    for (const p of c.posts) log(`${p.id} [${p.status}] ${p.type}${p.trailer ? `/${p.trailer}` : ""}${p.plannedFor ? ` @${p.plannedFor}` : ""}: ${p.text}\n   ${p.status === "posted" ? p.xUrl : composeUrl(p, c.game)}`);
  } else if (cmd === "posted") {
    const [id, xUrl] = rest, p = c.posts.find((x) => x.id === id);
    if (!p || !xUrl) throw new Error("Usage: campaign.mjs posted <id> <x-post-url>");
    Object.assign(p, { status: "posted", xUrl, postedAt: opt("--at") || new Date().toISOString() }); save(file, c);
    log(`${id} marked as posted`);
  } else if (cmd === "log") {
    const [id, ...pairs] = rest, p = c.posts.find((x) => x.id === id);
    if (!p) throw new Error(`No post ${id}`);
    const m = { at: new Date().toISOString() };
    for (const kv of pairs) {
      const [k, v] = kv.split("=");
      if (!METRICS.includes(k) || !Number.isFinite(Number(v))) throw new Error(`Bad metric "${kv}". Known: ${METRICS.join(", ")}`);
      m[k] = Number(v);
    }
    p.metrics.push(m); save(file, c);
    log(`Logged ${pairs.length} metric(s) for ${id}`);
  } else if (cmd === "report") {
    const out = path.resolve(opt("--out") || path.join(path.dirname(file), "campaign.html"));
    fs.writeFileSync(out, reportHtml(c));
    const { byType } = summarize(c);
    for (const [k, g] of Object.entries(byType)) log(`${k}: ${g.posts} post(s), ${g.impressions} impressions, ${(g.engagementRate * 100).toFixed(1)}% engagement, ${(g.clickRate * 100).toFixed(2)}% link clicks`);
    log(`Report: ${out}`);
  } else {
    throw new Error("Commands: init, add, list, posted, log, report (see the top of campaign.mjs)");
  }
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  run(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exit(1); });
}
